import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig, validateField } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";
import { findTaskById, updateTask } from "../lib/task.js";

export function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("Update a task's fields or body")
    .argument("<id>", "Task ID (numeric)")
    .option("-s, --set <kv...>", "Set front matter fields (key=value)")
    .option("-b, --body <text>", "Replace markdown body")
    .action(async (idStr: string, opts: { set?: string[]; body?: string }) => {
      const id = Number.parseInt(idStr, 10);
      if (Number.isNaN(id) || id <= 0) {
        console.error(pc.red("Error: ID must be a positive number."));
        process.exitCode = 1;
        return;
      }

      if (!opts.set?.length && opts.body === undefined) {
        console.error(
          pc.red("Error: Provide at least one update (--set or --body)."),
        );
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
      const statuses = config.fields.status ?? [];

      // Check task exists first
      const task = await findTaskById(cwd, statuses, id);
      if (!task) {
        console.error(pc.red(`Error: Task ${id} not found.`));
        process.exitCode = 1;
        return;
      }

      // Parse --set key=value pairs
      const frontMatter: Record<string, unknown> = {};
      if (opts.set) {
        for (const kv of opts.set) {
          const eqIndex = kv.indexOf("=");
          if (eqIndex === -1) {
            console.error(
              pc.red(`Error: Invalid format "${kv}". Use key=value.`),
            );
            process.exitCode = 1;
            return;
          }
          const key = kv.slice(0, eqIndex);
          const value = kv.slice(eqIndex + 1);
          frontMatter[key] = value;
        }
      }

      // Validate --set fields against config
      for (const [key, value] of Object.entries(frontMatter)) {
        const err = validateField(key, value as string, config);
        if (err) {
          console.error(pc.red(`Error: ${err}`));
          process.exitCode = 1;
          return;
        }
      }

      try {
        const result = await updateTask(cwd, statuses, id, {
          frontMatter:
            Object.keys(frontMatter).length > 0 ? frontMatter : undefined,
          body: opts.body,
        });
        console.log(pc.green(`Updated task ${id} (${result.filename})`));
      } catch (err) {
        console.error(pc.red(`Error: ${(err as Error).message}`));
        process.exitCode = 1;
      }
    });
}
