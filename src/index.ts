import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerWebCommand } from "./commands/web.js";

const program = new Command();

program
  .name("jobdone")
  .description(
    "Simple text-based task manager. Built for AI agents. Comfortable for humans.",
  )
  .version("0.1.0");

registerInitCommand(program);
registerWebCommand(program);

program.parse();
