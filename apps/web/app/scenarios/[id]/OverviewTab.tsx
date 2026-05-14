import { ScenarioPreviewChart, CopyableCommand, DifficultyStars } from "@crucible/ui-kit";
import type { ScenarioDetail } from "@/lib/scenarios";

function inlineMarkdown(text: string | undefined): string[] {
  if (!text) return [];
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function OverviewTab({ scenario }: { scenario: ScenarioDetail }) {
  const paragraphs = inlineMarkdown(scenario.description);
  const testLines = inlineMarkdown(scenario.tests);
  const command = [
    "git clone https://github.com/<owner>/crucible-bench && cd crucible-bench",
    "pnpm install",
    `pnpm --filter @crucible/cli run dev -- run scenarios/${scenario.id} \\`,
    `    --recipe apps/cli/test/fixtures/haiku-cheap-recipe.yaml \\`,
    `    --publish-network galileo`,
  ].join("\n");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Big preview chart */}
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl overflow-hidden card-elevated">
          <div className="px-5 py-3 border-b border-[#1c2538] flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#e6e9f0]">Scenario preview</span>
            <span className="text-[11px] text-[#aab2c5]">
              <span className="font-mono text-[#e6e9f0]">{scenario.durationTicks}</span> ticks
            </span>
          </div>
          <div className="p-5">
            <ScenarioPreviewChart
              points={scenario.previewPoints}
              height={300}
              newsIndexes={scenario.newsIndexes}
            />
          </div>
        </div>

        {/* What happened */}
        {paragraphs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#e6e9f0]">What happened</h2>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[14px] leading-[1.7] text-[#aab2c5]">{p}</p>
            ))}
          </section>
        )}

        {/* What this tests */}
        {testLines.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[16px] font-semibold text-[#e6e9f0]">What this tests</h2>
            <ul className="space-y-2">
              {testLines.map((p, i) => (
                <li key={i} className="text-[14px] leading-[1.65] text-[#aab2c5] pl-4 relative">
                  <span className="absolute left-0 top-[10px] w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
                  {p.replace(/^[-•]\s*/, "")}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Run locally */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold text-[#e6e9f0]">Run it locally</h2>
          <CopyableCommand command={command} />
        </section>
      </div>

      {/* Right rail: at-a-glance */}
      <aside className="space-y-4">
        <div className="bg-[#0f1623] border border-[#1c2538] rounded-2xl card-elevated">
          <div className="px-4 py-3 border-b border-[#1c2538] text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">
            At a glance
          </div>
          <dl className="divide-y divide-[#1c2538]">
            <Row label="Asset" value={scenario.asset} />
            <Row label="Ticks" value={scenario.durationTicks.toString()} mono />
            <Row label="Tick interval" value={`${scenario.tickIntervalMs} ms`} mono />
            <Row label="Starting cash" value={`$${scenario.startingCashUsd.toLocaleString()}`} mono />
            <Row label="Starting position" value={scenario.startingPosition.toString()} mono />
            {scenario.difficulty !== undefined && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">Difficulty</span>
                <DifficultyStars level={scenario.difficulty} />
              </div>
            )}
          </dl>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">{label}</span>
      <span className={`text-[13px] text-[#e6e9f0] ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
