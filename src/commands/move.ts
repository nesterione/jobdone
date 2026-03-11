import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig, validateField } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";
import { moveTask, readAllTasks } from "../lib/task.js";

function jsonError(message: string): void {
  console.error(JSON.stringify({ error: message }));
  process.exitCode = 1;
}

export function registerMoveCommand(program: Command): void {
  program
    .command("move")
    .description("Move a task to a different status")
    .argument("<filename>", "Task filename (e.g. 1-fix-bug.md)")
    .argument("<target-status>", "Target status (e.g. doing, done)")
    .option("--json", "Output as JSON")
    .action(
      async (
        filename: string,
        targetStatus: string,
        opts: { json?: boolean },
      ) => {
        const cwd = process.cwd();
        const jobdonePath = getJobdonePath(cwd);

        const exists = await fs
          .access(jobdonePath)
          .then(() => true)
          .catch(() => false);

        if (!exists) {
          const msg = ".jobdone/ not found. Run `jobdone init` first.";
          if (opts.json) {
            jsonError(msg);
          } else {
            console.error(pc.red(`Error: ${msg}`));
            process.exitCode = 1;
          }
          return;
        }

        const config = await loadConfig(cwd);
        const statuses = config.fields.status ?? [];

        const statusErr = validateField("status", targetStatus, config);
        if (statusErr) {
          if (opts.json) {
            jsonError(statusErr);
          } else {
            console.error(pc.red(`Error: ${statusErr}`));
            process.exitCode = 1;
          }
          return;
        }

        // Find which status the task is currently in
        const grouped = await readAllTasks(cwd, statuses);
        let currentStatus: string | null = null;
        for (const status of statuses) {
          if (grouped[status]?.some((t) => t.filename === filename)) {
            currentStatus = status;
            break;
          }
        }

        if (!currentStatus) {
          const msg = `Task "${filename}" not found.`;
          if (opts.json) {
            jsonError(msg);
          } else {
            console.error(pc.red(`Error: ${msg}`));
            process.exitCode = 1;
          }
          return;
        }

        if (currentStatus === targetStatus) {
          if (opts.json) {
            console.log(
              JSON.stringify(
                {
                  ok: true,
                  filename,
                  from: currentStatus,
                  to: targetStatus,
                },
                null,
                2,
              ),
            );
          } else {
            console.log(pc.yellow(`Task is already in "${targetStatus}".`));
          }
          return;
        }

        try {
          const result = await moveTask(
            cwd,
            filename,
            currentStatus,
            targetStatus,
          );
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(
              pc.green(`Moved ${filename}: ${currentStatus} → ${targetStatus}`),
            );
          }
        } catch (err) {
          const msg = (err as Error).message;
          if (opts.json) {
            jsonError(msg);
          } else {
            console.error(pc.red(`Error: ${msg}`));
            process.exitCode = 1;
          }
        }
      },
    );
}
