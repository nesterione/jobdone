import { Command } from "commander";
import { registerCreateCommand } from "./commands/create.js";
import { registerInitCommand } from "./commands/init.js";
import { registerListCommand } from "./commands/list.js";
import { registerMigrateCommand } from "./commands/migrate.js";
import { registerMoveCommand } from "./commands/move.js";
import { registerWebCommand } from "./commands/web.js";

const program = new Command();

program
  .name("jobdone")
  .description(
    "Simple text-based task manager. Built for AI agents. Comfortable for humans.",
  )
  .version("0.1.0");

registerCreateCommand(program);
registerInitCommand(program);
registerListCommand(program);
registerMigrateCommand(program);
registerMoveCommand(program);
registerWebCommand(program);

program.parse();
