import type { JobdoneConfig } from "../lib/config.js";
import { moveTask, readAllTasks } from "../lib/task.js";
import { generateHtml } from "./html.js";
import type { TaskWatcher } from "./watcher.js";

export function createRouteHandler(
  cwd: string,
  config: JobdoneConfig,
  watcher: TaskWatcher,
): (req: Request) => Response | Promise<Response> {
  const html = generateHtml(config.statuses);

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (req.method === "GET" && url.pathname === "/api/tasks") {
      const tasks = await readAllTasks(cwd, config.statuses);
      return Response.json(tasks);
    }

    if (req.method === "POST" && url.pathname === "/api/tasks/move") {
      const body = (await req.json()) as {
        filename: string;
        from: string;
        to: string;
      };
      if (!body.filename || !body.from || !body.to) {
        return Response.json({ error: "Missing fields" }, { status: 400 });
      }
      if (
        !config.statuses.includes(body.from) ||
        !config.statuses.includes(body.to)
      ) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      try {
        await moveTask(cwd, body.filename, body.from, body.to);
        return Response.json({ ok: true });
      } catch (err) {
        return Response.json(
          { error: (err as Error).message },
          { status: 500 },
        );
      }
    }

    if (req.method === "GET" && url.pathname === "/api/events") {
      const stream = watcher.createStream();
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  };
}
