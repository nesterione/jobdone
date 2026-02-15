import type { Server } from "bun";
import { loadConfig } from "../lib/config.js";
import { createRouteHandler } from "./routes.js";
import { TaskWatcher } from "./watcher.js";

export interface StartServerOptions {
  cwd: string;
  port: number;
}

export interface ServerHandle {
  server: Server;
  watcher: TaskWatcher;
  stop: () => void;
}

export async function startServer(
  options: StartServerOptions,
): Promise<ServerHandle> {
  const { cwd, port } = options;
  const config = await loadConfig(cwd);
  const watcher = new TaskWatcher();
  watcher.start(cwd, config.statuses);

  const handler = createRouteHandler(cwd, config, watcher);

  const server = Bun.serve({
    port,
    fetch: handler,
  });

  return {
    server,
    watcher,
    stop() {
      watcher.stop();
      server.stop();
    },
  };
}
