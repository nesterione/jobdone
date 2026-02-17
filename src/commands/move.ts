import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";
import { moveTask, readAllTasks } from "../lib/task.js";

export function registerMoveCommand(program: Command): void {
  program
    .command("move")
    .description("Move a task to a different status")
    .argument("<filename>", "Task filename (e.g. 1-fix-bug.md)")
    .argument("<target-status>", "Target status (e.g. doing, done)")
    .action(async (filename: string, targetStatus: string) => {
      const cwd = process.cwd();
      const jobdonePath = getJobdonePath(cwd);

      const exists = await fs
        .access(jobdonePath)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        console.error(
          pc.red("Error: .jobdone/ not found. Run `jobdone init` first."),
        );
        process.exitCode = 1;
        return;
      }

      const config = await loadConfig(cwd);

      if (!config.statuses.includes(targetStatus)) {
        console.error(
          pc.red(
            `Error: Invalid status "${targetStatus}". Valid statuses: ${config.statuses.join(", ")}`,
          ),
        );
        process.exitCode = 1;
        return;
      }

      // Find which status the task is currently in
      const grouped = await readAllTasks(cwd, config.statuses);
      let currentStatus: string | null = null;
      for (const status of config.statuses) {
        if (grouped[status]?.some((t) => t.filename === filename)) {
          currentStatus = status;
          break;
        }
      }

      if (!currentStatus) {
        console.error(pc.red(`Error: Task "${filename}" not found.`));
        process.exitCode = 1;
        return;
      }

      if (currentStatus === targetStatus) {
        console.log(pc.yellow(`Task is already in "${targetStatus}".`));
        return;
      }

      try {
        await moveTask(cwd, filename, currentStatus, targetStatus);
        console.log(
          pc.green(`Moved ${filename}: ${currentStatus} → ${targetStatus}`),
        );
      } catch (err) {
        console.error(pc.red(`Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
