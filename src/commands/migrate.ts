import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import {
  type JobdoneConfig,
  loadRawConfig,
  migrateConfig,
  serializeConfig,
} from "../lib/config.js";
import { getConfigPath, getJobdonePath, getTasksPath } from "../lib/paths.js";

export function registerMigrateCommand(program: Command): void {
  program
    .command("migrate")
    .description("Migrate config and folder structure to the latest version")
    .action(async () => {
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

      let raw: Record<string, unknown>;
      try {
        raw = await loadRawConfig(cwd);
      } catch {
        console.error(pc.red("Error: Could not read .jobdone/config.yaml"));
        process.exitCode = 1;
        return;
      }

      const { config, changes } = migrateConfig(raw);

      if (changes.length === 0) {
        console.log(pc.green("Nothing to migrate — config is up to date."));
        return;
      }

      const configPath = getConfigPath(cwd);
      await fs.writeFile(
        configPath,
        serializeConfig(config as unknown as JobdoneConfig),
        "utf-8",
      );

      const statuses = (config.statuses ?? []) as string[];
      const tasksPath = getTasksPath(cwd);
      const createdFolders: string[] = [];

      for (const status of statuses) {
        const folderPath = path.join(tasksPath, status);
        const folderExists = await fs
          .access(folderPath)
          .then(() => true)
          .catch(() => false);
        if (!folderExists) {
          await fs.mkdir(folderPath, { recursive: true });
          createdFolders.push(status);
        }
      }

      console.log(pc.green("Migration complete:"));
      for (const change of changes) {
        console.log(pc.green(`  - ${change}`));
      }
      if (createdFolders.length > 0) {
        for (const folder of createdFolders) {
          console.log(
            pc.green(`  - Created folder: .jobdone/tasks/${folder}/`),
          );
        }
      }
    });
}
