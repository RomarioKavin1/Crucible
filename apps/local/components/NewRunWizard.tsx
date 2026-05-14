"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ScenarioListing {
  dir: string;
  id: string;
  title: string;
  asset?: string;
  ticks?: number;
  startingCash?: number;
}

interface RecipeListing {
  path: string;
  name: string;
  provider?: string;
  modelId?: string;
}

export function NewRunWizard() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioListing[]>([]);
  const [recipes, setRecipes] = useState<RecipeListing[]>([]);
  const [scenarioDir, setScenarioDir] = useState<string>("");
  const [recipePath, setRecipePath] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/scenarios").then((r) => r.json()),
      fetch("/api/recipes").then((r) => r.json()),
    ]).then(([s, r]) => {
      const sList: ScenarioListing[] = s.scenarios ?? [];
      const rList: RecipeListing[] = r.recipes ?? [];
      setScenarios(sList);
      setRecipes(rList);
      if (sList[0] && !scenarioDir) setScenarioDir(sList[0].dir);
      if (rList[0] && !recipePath) setRecipePath(rList[0].path);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!scenarioDir || !recipePath) {
      setError("Pick a scenario and a recipe.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioDir, recipePath }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { runId } = await resp.json();
      router.push(`/runs/${runId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Configure</h2>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-[#e5e9f0]">New Run</h1>
        <p className="font-mono text-xs text-[#5e6b80] mt-2">
          Pick a market scenario and an agent recipe. Start the run and watch live tape + reasoning roll in.
        </p>
      </div>

      <Section
        label="Scenario"
        hint="Replayed market — fixed price tape with deterministic news beats."
      >
        {scenarios.length === 0 ? (
          <Empty>// no scenarios found in scenarios/</Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {scenarios.map((s) => (
              <Card
                key={s.dir}
                selected={scenarioDir === s.dir}
                onClick={() => setScenarioDir(s.dir)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm text-[#e5e9f0]">{s.title}</span>
                  {s.asset && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#22d3ee]">{s.asset}</span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[#5e6b80] truncate">{s.id}</div>
                <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-[#5e6b80]">
                  {s.ticks !== undefined && (
                    <span>ticks <span className="text-[#e5e9f0] tabular-nums">{s.ticks}</span></span>
                  )}
                  {s.startingCash !== undefined && (
                    <span>cash <span className="text-[#e5e9f0] tabular-nums">${s.startingCash.toLocaleString()}</span></span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section
        label="Recipe"
        hint="Agent config — model, system prompt, and per-tick budgets."
      >
        {recipes.length === 0 ? (
          <Empty>// no recipes found in apps/cli/test/fixtures/</Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recipes.map((r) => (
              <Card
                key={r.path}
                selected={recipePath === r.path}
                onClick={() => setRecipePath(r.path)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm text-[#e5e9f0]">{r.name}</span>
                  {r.provider && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a855f7]">{r.provider}</span>
                  )}
                </div>
                {r.modelId && (
                  <div className="mt-1 font-mono text-[10px] text-[#5e6b80] truncate">{r.modelId}</div>
                )}
                <div className="mt-2 font-mono text-[10px] text-[#5e6b80] truncate">{r.path}</div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {error && (
        <div className="bg-[#ef444411] border border-[#ef4444] rounded px-3 py-2 font-mono text-xs text-[#ef4444]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={submit}
          disabled={submitting || !scenarioDir || !recipePath}
          className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#22d3ee] disabled:bg-[#1f2a3d] disabled:text-[#5e6b80] hover:bg-[#67e8f9] text-[#070b14] px-5 py-2.5 rounded transition-colors"
        >
          {submitting ? "Starting..." : "▶ Start Run"}
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6b80]">
          requires <code className="text-[#22d3ee] normal-case">ANTHROPIC_API_KEY</code> in env
        </span>
      </div>
    </div>
  );
}

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80]">{label}</h3>
        {hint && <p className="font-mono text-[10px] text-[#3a4456]">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Card({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded border p-3 transition-colors ${
        selected
          ? "bg-[#22d3ee0a] border-[#22d3ee] shadow-[0_0_0_1px_#22d3ee44]"
          : "bg-[#0f1623] border-[#1f2a3d] hover:border-[#22d3ee44]"
      }`}
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0f1623] border border-dashed border-[#1f2a3d] rounded p-6 text-center font-mono text-xs text-[#5e6b80]">
      {children}
    </div>
  );
}
