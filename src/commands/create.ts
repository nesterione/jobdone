import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig, validateField } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";
import { createTask } from "../lib/task.js";

export function registerCreateCommand(program: Command): void {
  program
    .command("create")
    .description("Create a new task")
    .argument("<title>", "Task title")
    .option("-p, --priority <level>", "Priority level")
    .option("-b, --body <text>", "Body content below front matter")
    .option("-s, --set <kv...>", "Set front matter field (repeatable)")
    .action(
      async (
        title: string,
        opts: { priority?: string; body?: string; set?: string[] },
      ) => {
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

        // Validate -p flag
        const resolvedPriority = opts.priority ?? config.defaults.priority;
        const priorityErr = validateField("priority", resolvedPriority, config);
        if (priorityErr) {
          console.error(pc.red(`Error: ${priorityErr}`));
          process.exitCode = 1;
          return;
        }

        const frontMatter: Record<string, unknown> = {};
        for (const kv of opts.set ?? []) {
          const eqIndex = kv.indexOf("=");
          if (eqIndex === -1) {
            console.error(
              pc.red(`Error: Invalid format "${kv}". Use key=value.`),
            );
            process.exitCode = 1;
            return;
          }
          frontMatter[kv.slice(0, eqIndex)] = kv.slice(eqIndex + 1);
        }

        // Validate --set fields
        for (const [key, value] of Object.entries(frontMatter)) {
          const err = validateField(key, value as string, config);
          if (err) {
            console.error(pc.red(`Error: ${err}`));
            process.exitCode = 1;
            return;
          }
        }

        try {
          const result = await createTask({
            cwd,
            title,
            priority: opts.priority,
            body: opts.body,
            extraFields:
              Object.keys(frontMatter).length > 0 ? frontMatter : undefined,
            config,
          });
          console.log(pc.green(`✓ Created task: ${result.relativePath}`));
        } catch (err) {
          console.error(pc.red(`Error: ${(err as Error).message}`));
          process.exitCode = 1;
        }
      },
    );
}
