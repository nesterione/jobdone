import { createRequire } from "node:module";
import { Command } from "commander";
import { registerCreateCommand } from "./commands/create.js";
import { registerGetCommand } from "./commands/get.js";
import { registerInitCommand } from "./commands/init.js";
import { registerListCommand } from "./commands/list.js";
import { registerMigrateCommand } from "./commands/migrate.js";
import { registerMoveCommand } from "./commands/move.js";
import { registerUpdateCommand } from "./commands/update.js";
import { registerWebCommand } from "./commands/web.js";

declare const PACKAGE_VERSION: string;
const version =
  typeof PACKAGE_VERSION !== "undefined"
    ? PACKAGE_VERSION
    : createRequire(import.meta.url)("../package.json").version;

const program = new Command();

program
  .name("jobdone")
  .description(
    "Simple text-based task manager. Built for AI agents. Comfortable for humans.",
  )
  .version(version);

registerCreateCommand(program);
registerGetCommand(program);
registerInitCommand(program);
registerListCommand(program);
registerMigrateCommand(program);
registerMoveCommand(program);
registerUpdateCommand(program);
registerWebCommand(program);

program.parse();
