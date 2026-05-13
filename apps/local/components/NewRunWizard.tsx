"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewRunWizard() {
  const router = useRouter();
  const [scenarioDir, setScenarioDir] = useState("scenarios/synthetic-eth-flash-crash");
  const [recipePath, setRecipePath] = useState("apps/cli/test/fixtures/baseline-recipe.yaml");
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
    <div className="max-w-xl space-y-4">
      <h2 className="text-2xl font-semibold">New Run</h2>
      <Field label="Scenario directory" value={scenarioDir} onChange={setScenarioDir} />
      <Field label="Recipe YAML path" value={recipePath} onChange={setRecipePath} />
      {error && <div className="text-red-400 text-sm">Error: {error}</div>}
      <button
        onClick={submit}
        disabled={submitting}
        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white px-4 py-2 rounded text-sm"
      >
        {submitting ? "Starting..." : "Start Run"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono"
      />
    </div>
  );
}
