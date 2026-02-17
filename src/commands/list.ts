import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";
import {
  type GroupedTasks,
  parseFrontMatter,
  readAllTasks,
} from "../lib/task.js";

interface JsonTask {
  filename: string;
  status: string;
  title: string;
  priority: string;
  created: string;
  body: string;
}

interface JsonOutput {
  statuses: string[];
  tasks: Record<string, JsonTask[]>;
}

function toJsonOutput(statuses: string[], grouped: GroupedTasks): JsonOutput {
  const tasks: Record<string, JsonTask[]> = {};
  for (const status of statuses) {
    tasks[status] = (grouped[status] ?? []).map((t) => {
      const { body } = parseFrontMatter(t.raw);
      return {
        filename: t.filename,
        status: t.status,
        title: t.title,
        priority: t.priority,
        created: t.created,
        body,
      };
    });
  }
  return { statuses, tasks };
}

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List all tasks")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
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
      const grouped = await readAllTasks(cwd, config.statuses);

      if (opts.json) {
        const output = toJsonOutput(config.statuses, grouped);
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Human-readable output
      for (const status of config.statuses) {
        const tasks = grouped[status] ?? [];
        console.log(pc.bold(`\n${status.toUpperCase()} (${tasks.length})`));
        if (tasks.length === 0) {
          console.log(pc.dim("  No tasks"));
        }
        for (const task of tasks) {
          const priority =
            task.priority === "high"
              ? pc.red(task.priority)
              : task.priority === "low"
                ? pc.dim(task.priority)
                : pc.yellow(task.priority);
          console.log(`  ${task.filename}  ${task.title}  [${priority}]`);
        }
      }
    });
}
