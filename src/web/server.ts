import http from "node:http";
import type { AddressInfo } from "node:net";
import { loadConfig } from "../lib/config.js";
import { createRouteHandler } from "./routes.js";
import { TaskWatcher } from "./watcher.js";

export interface StartServerOptions {
  cwd: string;
  port: number;
}

export interface ServerHandle {
  server: http.Server;
  port: number;
  watcher: TaskWatcher;
  stop: () => void;
}

async function toFetchRequest(req: http.IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await collectBody(req)
      : undefined;
  return new Request(url, {
    method: req.method,
    headers: Object.entries(req.headers)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]) as [
      string,
      string,
    ][],
    body,
  });
}

function collectBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function sendFetchResponse(
  res: Response,
  serverRes: http.ServerResponse,
): Promise<void> {
  serverRes.writeHead(res.status, Object.fromEntries(res.headers));
  if (res.body) {
    for await (const chunk of res.body) {
      serverRes.write(chunk);
    }
  }
  serverRes.end();
}

export async function startServer(
  options: StartServerOptions,
): Promise<ServerHandle> {
  const { cwd, port } = options;
  const config = await loadConfig(cwd);
  const watcher = new TaskWatcher();
  watcher.start(cwd, config.statuses);

  const handler = createRouteHandler(cwd, config, watcher);

  const server = http.createServer(async (req, res) => {
    const fetchReq = await toFetchRequest(req);
    const fetchRes = await handler(fetchReq);
    await sendFetchResponse(fetchRes, res);
  });

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  const resolvedPort = (server.address() as AddressInfo).port;

  return {
    server,
    port: resolvedPort,
    watcher,
    stop() {
      watcher.stop();
      server.close();
    },
  };
}
