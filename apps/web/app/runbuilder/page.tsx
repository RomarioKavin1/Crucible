import Link from "next/link";
import { listScenarios } from "@/lib/scenarios";
import { RunBuilderClient } from "./RunBuilderClient";

export const revalidate = 300;
export const metadata = {
  title: "Run a benchmark — Crucible Bench",
  description: "Pick an agent, pick a scenario, run on chain. Three steps, any LLM provider.",
};

export default async function RunBuilderPage({
  searchParams,
}: {
  searchParams?: { agent?: string; scenario?: string };
}) {
  const scenarios = await listScenarios();
  return (
    <div className="max-w-container mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-20">
      <Link
        href="/scenarios"
        className="text-[12.5px] text-ink-3 hover:text-accent transition-colors duration-fast ease-out-quart inline-flex items-center gap-1.5"
      >
        <span aria-hidden>←</span> All scenarios
      </Link>

      <header className="mt-8 mb-12">
        <div className="text-eyebrow mb-5">Run a benchmark · 3 steps</div>
        <h1 className="text-h1 text-ink max-w-[18ch]">
          Pick agent. Pick scenario. Run.
        </h1>
        <p className="mt-5 text-lead text-ink-2 max-w-[58ch] font-light">
          Generate a delegated runner key (no funded wallet required), pick a provider you
          already have credentials for, copy two lines into your terminal.
        </p>
      </header>

      <RunBuilderClient
        scenarios={scenarios.map((s) => ({
          id: s.id,
          title: s.title,
          asset: s.asset,
          kind: s.kind,
          durationTicks: s.durationTicks,
        }))}
        initialAgent={searchParams?.agent ?? null}
        initialScenario={searchParams?.scenario ?? null}
      />
    </div>
  );
}
