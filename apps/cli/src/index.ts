#!/usr/bin/env node
import { Command } from "commander";
import { runCommand, type RunOpts } from "./run";
import { coachCommand } from "./coach";

const program = new Command();
program.name("crucible").description("Crucible — AI trading agent benchmark").version("0.1.0");

program
  .command("run")
  .description("Run an agent against a scenario, write trace.jsonl + scorecard")
  .requiredOption("-s, --scenario <path>", "Path to scenario bundle directory")
  .requiredOption("-a, --agent <path>", "Path to recipe.yaml")
  .option("-o, --out-dir <path>", "Output directory for runs", "./runs")
  .option("--publish-network <net>", "If set, publish run to 0G chain (galileo|mainnet)")
  .option("--publish-agent-id <id>", "Required with --publish-network: agent token id (number)")
  .option("--publish-key-env <env>", "Env var holding deployer private key", "DEPLOYER_PRIVATE_KEY")
  .action(async (opts) => {
    let publish: RunOpts["publish"] = undefined;
    if (opts.publishNetwork) {
      if (!opts.publishAgentId) throw new Error("--publish-network requires --publish-agent-id");
      const pk = process.env[opts.publishKeyEnv];
      if (!pk) throw new Error(`Missing env var ${opts.publishKeyEnv}`);
      publish = {
        agentId: BigInt(opts.publishAgentId),
        network: opts.publishNetwork as "galileo" | "mainnet",
        privateKey: pk,
      };
    }
    await runCommand({ scenario: opts.scenario, agent: opts.agent, outDir: opts.outDir, publish });
  });

program
  .command("coach")
  .description("Analyze a run directory and produce a coach-report.md")
  .requiredOption("-r, --run-dir <path>", "Path to a run directory (containing trace.jsonl + scorecard.json)")
  .option("-p, --system-prompt <text>", "Optional: the agent's system prompt for richer suggestions")
  .action(async (opts) => {
    await coachCommand({ runDir: opts.runDir, systemPrompt: opts.systemPrompt });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
