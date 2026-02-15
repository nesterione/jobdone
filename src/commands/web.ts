import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { getJobdonePath } from "../lib/paths.js";

function getPidPath(cwd: string): string {
  return path.join(getJobdonePath(cwd), "web.pid");
}

export function registerWebCommand(program: Command): void {
  program
    .command("web")
    .description("Start a Kanban board web UI")
    .option("-p, --port <number>", "port to listen on", "4040")
    .option("-d, --detach", "run in the background")
    .option("--stop", "stop a running background server")
    .action(async (opts) => {
      const cwd = process.cwd();
      const port = Number.parseInt(opts.port, 10);

      if (opts.stop) {
        await stopServer(cwd);
        return;
      }

      const jobdonePath = getJobdonePath(cwd);
      const exists = await fs
        .access(jobdonePath)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        console.error(pc.red("No .jobdone/ found. Run `jobdone init` first."));
        process.exitCode = 1;
        return;
      }

      if (opts.detach) {
        await startDetached(cwd, port);
        return;
      }

      const { startServer } = await import("../web/server.js");
      const handle = await startServer({ cwd, port });

      console.log(
        pc.green(
          `✓ Kanban board running at http://localhost:${handle.server.port}`,
        ),
      );
      console.log(pc.dim("  Press Ctrl+C to stop"));

      process.on("SIGINT", () => {
        handle.stop();
        process.exit(0);
      });
      process.on("SIGTERM", () => {
        handle.stop();
        process.exit(0);
      });
    });
}

async function startDetached(cwd: string, port: number): Promise<void> {
  const entryPath = path.resolve(import.meta.dir, "../web/server.ts");

  const script = `
    import { startServer } from "${entryPath}";
    const handle = await startServer({ cwd: "${cwd}", port: ${port} });
    console.log("Server started on port " + handle.server.port);
  `;

  const child = Bun.spawn(["bun", "-e", script], {
    cwd,
    stdio: ["ignore", "ignore", "ignore"],
  });

  child.unref();

  const pidPath = getPidPath(cwd);
  await fs.writeFile(pidPath, String(child.pid), "utf-8");

  console.log(
    pc.green(
      `✓ Kanban board running in background at http://localhost:${port}`,
    ),
  );
  console.log(pc.dim(`  PID ${child.pid} saved to ${pidPath}`));
  console.log(pc.dim("  Run `jobdone web --stop` to stop"));
}

async function stopServer(cwd: string): Promise<void> {
  const pidPath = getPidPath(cwd);
  let pidStr: string;
  try {
    pidStr = await fs.readFile(pidPath, "utf-8");
  } catch {
    console.error(pc.yellow("No running server found (no PID file)."));
    process.exitCode = 1;
    return;
  }

  const pid = Number.parseInt(pidStr.trim(), 10);
  try {
    process.kill(pid, "SIGTERM");
    console.log(pc.green(`✓ Stopped server (PID ${pid})`));
  } catch {
    console.log(pc.yellow(`Process ${pid} not found (already stopped?).`));
  }

  await fs.rm(pidPath, { force: true });
}
