"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewRunWizard() {
  const router = useRouter();
  const [scenarioDir, setScenarioDir] = useState("scenarios/synthetic-eth-flash-crash");
  const [recipePath, setRecipePath] = useState("apps/cli/test/fixtures/haiku-cheap-recipe.yaml");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
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
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5e6b80] mb-1">Configure</h2>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-[#e5e9f0]">New Run</h1>
      </div>
      <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-6 space-y-4">
        <Field label="Scenario directory" value={scenarioDir} onChange={setScenarioDir} />
        <Field label="Recipe YAML path" value={recipePath} onChange={setRecipePath} />
        {error && (
          <div className="bg-[#ef444411] border border-[#ef4444] rounded px-3 py-2 font-mono text-xs text-[#ef4444]">
            {error}
          </div>
        )}
        <button
          onClick={submit}
          disabled={submitting}
          className="font-mono text-[11px] uppercase tracking-[0.2em] bg-[#22d3ee] disabled:bg-[#1f2a3d] disabled:text-[#5e6b80] hover:bg-[#67e8f9] text-[#070b14] px-5 py-2.5 rounded transition-colors"
        >
          {submitting ? "Starting..." : "▶ Start Run"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#070b14] border border-[#1f2a3d] focus:border-[#22d3ee] outline-none rounded px-3 py-2 font-mono text-sm text-[#e5e9f0]"
      />
    </div>
  );
}
