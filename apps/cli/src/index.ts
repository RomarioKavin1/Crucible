#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();
program.name("crucible").description("Crucible — AI trading agent benchmark").version("0.1.0");

program.command("run").description("(implemented in Task 15)").action(() => {
  console.log("not yet implemented");
});

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
