import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../lib/config.js";
import { getJobdonePath, getTasksPath } from "../lib/paths.js";
import { getNextTaskIndex, toKebabCase } from "../lib/task.js";

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

      const slug = toKebabCase(title);
      if (!slug) {
        console.error(pc.red("Error: title produces an empty slug."));
        process.exitCode = 1;
        return;
      }

      const nextIndex = await getNextTaskIndex(cwd, config.statuses);
      const filename = `${nextIndex}-${slug}.md`;

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const dateStr = `${dd}.${mm}.${yyyy}`;

      const priority = opts.priority ?? config.defaults.priority;

      const content = config.defaults.template
        .replace("{{ title }}", title)
        .replace("{{ priority }}", priority)
        .replace("{{ date }}", dateStr);

      const todoDir = path.join(getTasksPath(cwd), "todo");
      await fs.mkdir(todoDir, { recursive: true });

      const filePath = path.join(todoDir, filename);
      await fs.writeFile(filePath, content, "utf-8");

      const relativePath = `.jobdone/tasks/todo/${filename}`;
      console.log(pc.green(`✓ Created task: ${relativePath}`));
    });
}
