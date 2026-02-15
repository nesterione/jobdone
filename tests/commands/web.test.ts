import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, serializeConfig } from "../../src/lib/config.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "../..");
const ENTRY = path.join(PROJECT_ROOT, "src/index.ts");

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-web-test-"));
  // Initialize .jobdone structure
  for (const status of DEFAULT_CONFIG.statuses) {
    await fs.mkdir(path.join(tmpDir, ".jobdone", "tasks", status), {
      recursive: true,
    });
  }
  await fs.writeFile(
    path.join(tmpDir, ".jobdone", "config.yaml"),
    serializeConfig(DEFAULT_CONFIG),
  );
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function runCli(args: string[], cwd: string) {
  return Bun.spawnSync(["bun", "run", ENTRY, ...args], {
    cwd,
    env: { ...process.env, PATH: process.env.PATH },
  });
}

describe("web command", () => {
  test("fails if .jobdone/ does not exist", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    await fs.mkdir(emptyDir, { recursive: true });
    const result = runCli(["web"], emptyDir);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain("No .jobdone/ found");
  });

  test("shows help with --help", () => {
    const result = runCli(["web", "--help"], tmpDir);
    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Kanban board");
    expect(stdout).toContain("--port");
    expect(stdout).toContain("--detach");
    expect(stdout).toContain("--stop");
  });

  test("--stop fails gracefully when no server running", () => {
    const result = runCli(["web", "--stop"], tmpDir);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain("No running server");
  });
});

describe("web server API", () => {
  let serverProcess: ReturnType<typeof Bun.spawn> | null = null;
  const port = 14040 + Math.floor(Math.random() * 1000);

  afterEach(async () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  test("serves kanban HTML and task API", async () => {
    // Create a sample task
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "todo", "sample-task.md"),
      `---
title: Sample Task
priority: high
created: 2026-01-15
---

## Description

A sample task for testing.
`,
    );

    // Start server in background
    serverProcess = Bun.spawn(
      ["bun", "run", ENTRY, "web", "--port", String(port)],
      {
        cwd: tmpDir,
        env: { ...process.env, PATH: process.env.PATH },
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Test GET /
    const htmlRes = await fetch(`http://localhost:${port}/`);
    expect(htmlRes.status).toBe(200);
    const html = await htmlRes.text();
    expect(html).toContain("jobdone");
    expect(html).toContain("Kanban");

    // Test GET /api/tasks
    const tasksRes = await fetch(`http://localhost:${port}/api/tasks`);
    expect(tasksRes.status).toBe(200);
    const tasks = await tasksRes.json();
    expect(tasks.todo).toHaveLength(1);
    expect(tasks.todo[0].title).toBe("Sample Task");
    expect(tasks.todo[0].priority).toBe("high");

    // Test POST /api/tasks/move
    const moveRes = await fetch(`http://localhost:${port}/api/tasks/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "sample-task.md",
        from: "todo",
        to: "doing",
      }),
    });
    expect(moveRes.status).toBe(200);

    // Verify file was moved
    const movedExists = await fs
      .access(
        path.join(tmpDir, ".jobdone", "tasks", "doing", "sample-task.md"),
      )
      .then(() => true)
      .catch(() => false);
    expect(movedExists).toBe(true);

    // Verify source is gone
    const srcGone = await fs
      .access(
        path.join(tmpDir, ".jobdone", "tasks", "todo", "sample-task.md"),
      )
      .then(() => true)
      .catch(() => false);
    expect(srcGone).toBe(false);

    // Test 404
    const notFound = await fetch(`http://localhost:${port}/nonexistent`);
    expect(notFound.status).toBe(404);
  });
});
