import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";
import { findTaskById } from "../lib/task.js";

export function registerGetCommand(program: Command): void {
  program
    .command("get")
    .description("Get full details of a task by ID")
    .argument("<id>", "Task ID (numeric)")
    .action(async (idStr: string) => {
      const id = Number.parseInt(idStr, 10);
      if (Number.isNaN(id) || id <= 0) {
        console.error(pc.red("Error: ID must be a positive number."));
        process.exitCode = 1;
        return;
      }

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
      const task = await findTaskById(cwd, config.statuses, id);

      if (!task) {
        console.error(pc.red(`Error: Task ${id} not found.`));
        process.exitCode = 1;
        return;
      }

      console.log(JSON.stringify(task, null, 2));
    });
}
