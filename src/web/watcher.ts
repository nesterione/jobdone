import fs from "node:fs";
import path from "node:path";
import { getTasksPath } from "../lib/paths.js";

type SSEController = ReadableStreamDefaultController<Uint8Array>;

export class TaskWatcher {
  private controllers = new Set<SSEController>();
  private watchers: fs.FSWatcher[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  start(cwd: string, statuses: string[]): void {
    const tasksPath = getTasksPath(cwd);

    for (const status of statuses) {
      const dirPath = path.join(tasksPath, status);
      try {
        const watcher = fs.watch(dirPath, () => this.scheduleNotify());
        this.watchers.push(watcher);
      } catch {
        // Directory may not exist yet — skip
      }
    }
  }

  private scheduleNotify(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.broadcast(), 200);
  }

  private broadcast(): void {
    const data = `data: ${JSON.stringify({ type: "refresh" })}\n\n`;
    const encoded = new TextEncoder().encode(data);
    for (const controller of this.controllers) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.controllers.delete(controller);
      }
    }
  }

  createStream(): ReadableStream<Uint8Array> {
    let savedController: SSEController;
    return new ReadableStream({
      start: (controller) => {
        savedController = controller;
        this.controllers.add(controller);
      },
      cancel: () => {
        this.controllers.delete(savedController);
      },
    });
  }

  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    for (const controller of this.controllers) {
      try {
        controller.close();
      } catch {
        // already closed
      }
    }
    this.controllers.clear();
  }
}
