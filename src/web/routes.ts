import {
  type JobdoneConfig,
  validateField,
  validateTitle,
} from "../lib/config.js";
import {
  createTask,
  findTaskById,
  moveTask,
  readAllTasks,
  reorderTasksInColumn,
  updateTask,
} from "../lib/task.js";
import { generateHtml } from "./html.js";
import type { TaskWatcher } from "./watcher.js";

export function createRouteHandler(
  cwd: string,
  config: JobdoneConfig,
  watcher: TaskWatcher,
): (req: Request) => Response | Promise<Response> {
  const html = generateHtml(
    config.fields.status ?? [],
    config.fields.priority ?? [],
    config.defaults.priority,
  );

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (req.method === "GET" && url.pathname === "/api/tasks") {
      const statuses = config.fields.status ?? [];
      const grouped = await readAllTasks(cwd, statuses);
      const tasks: Record<string, unknown[]> = {};
      for (const status of statuses) {
        tasks[status] = (grouped[status] ?? []).map((t) => ({
          filename: t.filename,
          status: t.status,
          title: t.title,
          priority: t.priority,
          created: t.created,
          body: t.raw,
        }));
      }
      return Response.json({ statuses, tasks });
    }

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const body = (await req.json()) as {
        title?: string;
        priority?: string;
      };

      const titleErr = validateTitle(body.title);
      if (titleErr) {
        return Response.json({ error: titleErr }, { status: 400 });
      }

      if (body.priority) {
        const priorityErr = validateField("priority", body.priority, config);
        if (priorityErr) {
          return Response.json({ error: priorityErr }, { status: 400 });
        }
      }

      try {
        const result = await createTask({
          cwd,
          title: (body.title as string).trim(),
          priority: body.priority,
          config,
        });
        return Response.json({ ok: true, filename: result.filename });
      } catch (err) {
        return Response.json(
          { error: (err as Error).message },
          { status: 500 },
        );
      }
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
      const fromErr = validateField("status", body.from, config);
      if (fromErr) {
        return Response.json({ error: fromErr }, { status: 400 });
      }
      const toErr = validateField("status", body.to, config);
      if (toErr) {
        return Response.json({ error: toErr }, { status: 400 });
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

    if (req.method === "POST" && url.pathname === "/api/tasks/reorder") {
      const body = (await req.json()) as {
        filename: string;
        status: string;
        newIndex: number;
      };
      if (!body.filename || !body.status || body.newIndex === undefined) {
        return Response.json({ error: "Missing fields" }, { status: 400 });
      }
      const statusErr = validateField("status", body.status, config);
      if (statusErr) {
        return Response.json({ error: statusErr }, { status: 400 });
      }
      try {
        await reorderTasksInColumn(
          cwd,
          body.status,
          config.fields.status ?? [],
          body.filename,
          body.newIndex,
        );
        return Response.json({ ok: true });
      } catch (err) {
        return Response.json(
          { error: (err as Error).message },
          { status: 500 },
        );
      }
    }

    const taskByIdMatch = url.pathname.match(/^\/api\/tasks\/(\d+)$/);
    if (req.method === "GET" && taskByIdMatch) {
      const id = Number.parseInt(taskByIdMatch[1], 10);
      const task = await findTaskById(cwd, config.fields.status ?? [], id);
      if (!task) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }
      return Response.json(task);
    }

    if (req.method === "PUT" && taskByIdMatch) {
      const id = Number.parseInt(taskByIdMatch[1], 10);
      const body = (await req.json()) as {
        frontMatter?: Record<string, unknown>;
        body?: string;
      };

      if (body.frontMatter?.priority) {
        const priorityErr = validateField(
          "priority",
          body.frontMatter.priority as string,
          config,
        );
        if (priorityErr) {
          return Response.json({ error: priorityErr }, { status: 400 });
        }
      }

      if (body.frontMatter?.title !== undefined) {
        const titleErr = validateTitle(body.frontMatter.title as string);
        if (titleErr) {
          return Response.json({ error: titleErr }, { status: 400 });
        }
      }

      try {
        const result = await updateTask(cwd, config.fields.status ?? [], id, {
          frontMatter: body.frontMatter,
          body: body.body,
        });
        return Response.json({
          ok: true,
          filename: result.filename,
          status: result.status,
        });
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
