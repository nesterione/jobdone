import fs from "node:fs/promises";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig, serializeConfig } from "../lib/config.js";
import { getJobdonePath } from "../lib/paths.js";

export function registerConfigCommand(program: Command): void {
  program
    .command("config")
    .description("Show the current jobdone configuration")
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

      if (opts.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(serializeConfig(config));
      }
    });
}
