import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";
import { createTask } from "../lib/task.js";

export function registerCreateCommand(program: Command): void {
  program
    .command("create")
    .description("Create a new task")
    .argument("<title>", "Task title")
    .option("-p, --priority <level>", "Priority level")
    .action(async (title: string, opts: { priority?: string }) => {
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

      try {
        const result = await createTask({
          cwd,
          title,
          priority: opts.priority,
          config,
        });
        console.log(pc.green(`✓ Created task: ${result.relativePath}`));
      } catch (err) {
        console.error(pc.red(`Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
