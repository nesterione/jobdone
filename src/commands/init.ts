import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { DEFAULT_CONFIG, serializeConfig } from "../lib/config.js";
import { getConfigPath, getJobdonePath, getTasksPath } from "../lib/paths.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a .jobdone/ folder in the current directory")
    .action(async () => {
      const cwd = process.cwd();
      const jobdonePath = getJobdonePath(cwd);

      const exists = await fs
        .access(jobdonePath)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        console.error(
          pc.yellow(`⚠ .jobdone/ already exists in ${cwd}. Skipping.`),
        );
        process.exitCode = 1;
        return;
      }

      const tasksPath = getTasksPath(cwd);
      for (const status of DEFAULT_CONFIG.statuses) {
        await fs.mkdir(path.join(tasksPath, status), { recursive: true });
      }

      const configPath = getConfigPath(cwd);
      await fs.writeFile(configPath, serializeConfig(DEFAULT_CONFIG), "utf-8");

      console.log(pc.green(`✓ Initialized .jobdone/ in ${cwd}`));
    });
}
