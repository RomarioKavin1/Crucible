#!/usr/bin/env node
import { Command } from "commander";
import { runCommand } from "./run.js";

const program = new Command();
program.name("crucible").description("Crucible — AI trading agent benchmark").version("0.1.0");

program
  .command("run")
  .description("Run an agent against a scenario, write trace.jsonl + scorecard")
  .requiredOption("-s, --scenario <path>", "Path to scenario bundle directory")
  .requiredOption("-a, --agent <path>", "Path to recipe.yaml")
  .option("-o, --out-dir <path>", "Output directory for runs", "./runs")
  .action(async (opts) => {
    await runCommand({ scenario: opts.scenario, agent: opts.agent, outDir: opts.outDir });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
