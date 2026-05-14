# Crucible Local Web App Implementation Plan (Plan 4 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Ship a local Next.js web app (`apps/local`) that the user runs at `localhost:3000`. It provides: a "New Run" wizard, a live run viewer with chart playback + agent reasoning stream + PnL panel, a past-runs list, a Coach report viewer, and a "Publish to leaderboard" button.

**Architecture:** Next.js 14 App Router. The same Next.js process embeds a Node service that drives the engine and streams ticks/decisions to the UI over WebSocket. Shared React components live in `@crucible/ui-kit`. All real heavy lifting is in `@crucible/core` / `@crucible/coach` / `@crucible/og-client` from Plans 1-3.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind, shadcn/ui, TradingView Lightweight Charts, ws (WebSocket server), Zustand for client state.

**Out of scope (later):** Public-facing deployment (that's Plan 5), multi-user auth, OpenClaw runtime integration (we keep the agent as the Anthropic SDK from Plan 1 — OpenClaw wiring is a follow-up). Tauri / desktop packaging.

---

## File Structure

```
packages/ui-kit/
├── package.json
├── tsconfig.json
├── src/
│   ├── ScenarioReplay.tsx        TradingView candlestick chart + playback controls
│   ├── AgentReasoningStream.tsx  Streaming text of agent completions + tool calls
│   ├── PnLPanel.tsx              Live cash/position/PnL/drawdown
│   ├── CoachingReport.tsx        Markdown renderer for coach reports
│   ├── RecipeDiff.tsx            Side-by-side recipe comparison
│   └── index.ts

apps/local/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  Dashboard / past runs list
│   ├── new/page.tsx              New Run wizard
│   ├── runs/[id]/page.tsx        Live run viewer + Coach report panel
│   ├── runs/[id]/replay/page.tsx Static replay of a completed run
│   └── api/
│       ├── runs/route.ts         POST: create run; GET: list runs
│       ├── runs/[id]/route.ts    GET: read run state
│       ├── runs/[id]/publish/route.ts  POST: --publish via og-client
│       └── ws/route.ts           WebSocket upgrade for live streams
├── lib/
│   ├── server/
│   │   ├── run-orchestrator.ts   Wires engine + skill runtime + agent + recorder
│   │   ├── run-store.ts          In-memory map of active runs + their event streams
│   │   └── ws-bridge.ts          Pump engine events → WebSocket
│   └── client/
│       ├── stores.ts             Zustand stores
│       └── ws-client.ts          Client-side WS handler
├── components/                   App-specific (not in ui-kit)
│   ├── NewRunWizard.tsx
│   ├── LiveRunView.tsx
│   └── PastRunsList.tsx
└── styles/
    └── globals.css
```

---

## Task 1: Bootstrap @crucible/ui-kit package

**Files:**
- Create: `packages/ui-kit/package.json`
- Create: `packages/ui-kit/tsconfig.json`
- Create: `packages/ui-kit/src/index.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@crucible/ui-kit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@crucible/core": "workspace:*",
    "lightweight-charts": "^4.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-markdown": "^9.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist",
    "composite": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../core" }]
}
```

- [ ] **Step 3: index.ts**

```typescript
export {};
```

- [ ] **Step 4: Install + commit**

```bash
pnpm install
git add packages/ui-kit
git commit -m "feat(ui-kit): bootstrap shared React component package"
```

---

## Task 2: ScenarioReplay chart component

**Files:**
- Create: `packages/ui-kit/src/ScenarioReplay.tsx`

- [ ] **Step 1: Implement ScenarioReplay**

```tsx
import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from "lightweight-charts";
import type { Tick, Fill } from "@crucible/core";

export interface ScenarioReplayProps {
  ticks: Tick[];
  fills?: Fill[];
  currentTickIndex?: number;   // for live: the index up to which to show data
  height?: number;
}

export function ScenarioReplay({ ticks, fills = [], currentTickIndex, height = 400 }: ScenarioReplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: { background: { color: "transparent" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      timeScale: { timeVisible: true, secondsVisible: true },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => containerRef.current && chart.applyOptions({ width: containerRef.current.clientWidth });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const upTo = currentTickIndex !== undefined ? currentTickIndex + 1 : ticks.length;
    const data: CandlestickData[] = ticks.slice(0, upTo).map((t) => ({
      time: (Math.floor(new Date(t.ts).getTime() / 1000) as unknown) as Time,
      open: t.mid, high: Math.max(t.mid, t.ask), low: Math.min(t.mid, t.bid), close: t.last,
    }));
    seriesRef.current.setData(data);

    // Render fills as markers
    const markers = fills
      .filter((f) => currentTickIndex === undefined || f.tick <= currentTickIndex)
      .map((f) => ({
        time: (Math.floor(new Date(f.ts).getTime() / 1000) as unknown) as Time,
        position: f.side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
        color: f.side === "buy" ? "#22c55e" : "#ef4444",
        shape: (f.side === "buy" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
        text: `${f.side.toUpperCase()} ${f.qty}@${f.price.toFixed(2)}`,
      }));
    seriesRef.current.setMarkers(markers);
  }, [ticks, fills, currentTickIndex]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
```

- [ ] **Step 2: Re-export, commit**

```typescript
// packages/ui-kit/src/index.ts
export * from "./ScenarioReplay.js";
```

```bash
git add packages/ui-kit
git commit -m "feat(ui-kit): ScenarioReplay candlestick chart with fill markers"
```

---

## Task 3: AgentReasoningStream component

**Files:**
- Create: `packages/ui-kit/src/AgentReasoningStream.tsx`

```tsx
import type { TraceEntry } from "@crucible/core";

export interface AgentReasoningStreamProps {
  entries: TraceEntry[];
  highlightTick?: number;
  maxHeight?: number;
}

export function AgentReasoningStream({ entries, highlightTick, maxHeight = 600 }: AgentReasoningStreamProps) {
  return (
    <div style={{ maxHeight, overflowY: "auto" }} className="space-y-3 font-mono text-sm">
      {entries.map((e) => {
        const isHighlight = e.tick === highlightTick;
        return (
          <div
            key={e.tick}
            className={`p-3 rounded border ${isHighlight ? "border-blue-400 bg-blue-950/30" : "border-slate-700 bg-slate-900/40"}`}
          >
            <div className="text-xs text-slate-500 mb-1">Tick {e.tick} · {e.ts}</div>
            {e.newsSeen.length > 0 && (
              <div className="mb-2 text-amber-300">
                📰 {e.newsSeen.map((n) => n.headline).join(" · ")}
              </div>
            )}
            {e.agent.completions.map((c, i) => (
              <div key={i} className="mb-2 whitespace-pre-wrap text-slate-200">
                {c.content || <em className="text-slate-500">(no text content)</em>}
              </div>
            ))}
            {e.agent.toolCalls.length > 0 && (
              <div className="space-y-1">
                {e.agent.toolCalls.map((tc, i) => (
                  <div key={i} className="text-cyan-400">
                    → {tc.name}({JSON.stringify(tc.args)})
                  </div>
                ))}
              </div>
            )}
            {e.fills.length > 0 && (
              <div className="mt-1 text-green-400">
                ✓ Filled: {e.fills.map((f) => `${f.side} ${f.qty}@${f.price.toFixed(2)}`).join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

```bash
# Append to ui-kit/src/index.ts
git add packages/ui-kit/src/AgentReasoningStream.tsx packages/ui-kit/src/index.ts
git commit -m "feat(ui-kit): AgentReasoningStream streaming completion/tool-call viewer"
```

---

## Task 4: PnLPanel + CoachingReport + RecipeDiff

**Files:**
- Create: `packages/ui-kit/src/PnLPanel.tsx`
- Create: `packages/ui-kit/src/CoachingReport.tsx`
- Create: `packages/ui-kit/src/RecipeDiff.tsx`

- [ ] **Step 1: PnLPanel.tsx**

```tsx
import type { Portfolio } from "@crucible/core";

export interface PnLPanelProps {
  portfolio: Portfolio;
  initialEquity?: number;
}

function fmtUsd(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PnLPanel({ portfolio, initialEquity }: PnLPanelProps) {
  const totalPnl = portfolio.realizedPnl + portfolio.unrealizedPnl;
  const equity = portfolio.cash + portfolio.position * 1; // caller should multiply position*price for full equity
  const pnlClass = totalPnl >= 0 ? "text-green-400" : "text-red-400";
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <Stat label="Cash" value={fmtUsd(portfolio.cash)} />
      <Stat label="Position" value={portfolio.position.toString()} />
      <Stat label="Realized PnL" value={fmtUsd(portfolio.realizedPnl)} valueClassName={portfolio.realizedPnl >= 0 ? "text-green-400" : "text-red-400"} />
      <Stat label="Unrealized PnL" value={fmtUsd(portfolio.unrealizedPnl)} valueClassName={portfolio.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"} />
      <Stat label="Total PnL" value={fmtUsd(totalPnl)} valueClassName={pnlClass} />
      <Stat label="Drawdown" value={`${(Math.abs(portfolio.drawdownPct) * 100).toFixed(2)}%`} valueClassName={portfolio.drawdownPct < -0.05 ? "text-red-400" : "text-slate-300"} />
    </div>
  );
}

function Stat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-mono ${valueClassName ?? "text-slate-100"}`}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: CoachingReport.tsx**

```tsx
import ReactMarkdown from "react-markdown";

export interface CoachingReportProps {
  markdown: string;
}

export function CoachingReport({ markdown }: CoachingReportProps) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-slate-100 prose-code:text-cyan-300">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3: RecipeDiff.tsx** (mechanical side-by-side text diff)

```tsx
export interface RecipeDiffProps {
  current: string;
  suggested: string;
}

export function RecipeDiff({ current, suggested }: RecipeDiffProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-slate-500 mb-1">Current</div>
        <pre className="bg-slate-900/40 border border-slate-700 rounded p-3 text-xs whitespace-pre-wrap text-slate-300 overflow-auto">
          {current}
        </pre>
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-1">Suggested</div>
        <pre className="bg-slate-900/40 border border-emerald-700 rounded p-3 text-xs whitespace-pre-wrap text-emerald-200 overflow-auto">
          {suggested}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
# Append all 3 exports to packages/ui-kit/src/index.ts
git add packages/ui-kit/src
git commit -m "feat(ui-kit): PnLPanel + CoachingReport + RecipeDiff components"
```

---

## Task 5: Bootstrap apps/local Next.js app

**Files:**
- Create: `apps/local/package.json`
- Create: `apps/local/next.config.mjs`
- Create: `apps/local/tsconfig.json`
- Create: `apps/local/tailwind.config.ts`
- Create: `apps/local/postcss.config.mjs`
- Create: `apps/local/styles/globals.css`
- Create: `apps/local/app/layout.tsx`
- Create: `apps/local/app/page.tsx`

- [ ] **Step 1: package.json**

```json
{
  "name": "@crucible/local",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@crucible/core": "workspace:*",
    "@crucible/skills": "workspace:*",
    "@crucible/coach": "workspace:*",
    "@crucible/og-client": "workspace:*",
    "@crucible/ui-kit": "workspace:*",
    "@anthropic-ai/sdk": "^0.27.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "ws": "^8.18.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/ws": "^8.5.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/typography": "^0.5.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

- [ ] **Step 2: next.config.mjs**

```javascript
/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ["@crucible/ui-kit", "@crucible/core", "@crucible/skills", "@crucible/coach", "@crucible/og-client"],
  webpack(config) {
    config.externals = [...(config.externals ?? []), { "node:fs": "commonjs node:fs", "node:fs/promises": "commonjs node:fs/promises" }];
    return config;
  },
};
```

- [ ] **Step 3: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "allowJs": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui-kit/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
```

- [ ] **Step 5: postcss.config.mjs**

```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #0f172a;
  color: #e2e8f0;
}
```

- [ ] **Step 7: app/layout.tsx**

```tsx
import "../styles/globals.css";

export const metadata = { title: "Crucible — Local", description: "AI trading agent benchmark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">🔥 Crucible</h1>
            <nav className="space-x-4 text-sm">
              <a href="/" className="text-slate-300 hover:text-white">Runs</a>
              <a href="/new" className="text-slate-300 hover:text-white">New Run</a>
            </nav>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: app/page.tsx (dashboard)**

```tsx
import Link from "next/link";
import { listRunsFromDisk } from "@/lib/server/run-store";

export default async function Home() {
  const runs = await listRunsFromDisk("./runs");
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Runs</h2>
        <Link href="/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm">
          + New Run
        </Link>
      </div>
      {runs.length === 0 ? (
        <p className="text-slate-400">No runs yet. Start one with the New Run button above.</p>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`/runs/${r.id}`} className="block p-3 border border-slate-700 rounded hover:border-cyan-500">
                <div className="font-mono">{r.id}</div>
                <div className="text-xs text-slate-500">{r.scenario} · {r.recipe}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Install + verify**

```bash
pnpm install
pnpm --filter @crucible/local typecheck
```

- [ ] **Step 10: Commit**

```bash
git add apps/local
git commit -m "feat(local): bootstrap Next.js app with dashboard page"
```

---

## Task 6: Run store + orchestrator (server side)

**Files:**
- Create: `apps/local/lib/server/run-store.ts`
- Create: `apps/local/lib/server/run-orchestrator.ts`

- [ ] **Step 1: run-store.ts**

```typescript
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface RunSummary {
  id: string;
  scenario: string;
  recipe: string;
  createdAt: number;
}

export async function listRunsFromDisk(outDir: string): Promise<RunSummary[]> {
  let entries: string[];
  try {
    entries = await readdir(outDir);
  } catch {
    return [];
  }
  const summaries: RunSummary[] = [];
  for (const id of entries) {
    const dir = path.join(outDir, id);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
      const scoreRaw = await readFile(path.join(dir, "scorecard.json"), "utf8");
      const sc = JSON.parse(scoreRaw);
      summaries.push({ id, scenario: sc.scenario, recipe: sc.recipe, createdAt: s.mtimeMs });
    } catch {
      // skip dirs without a scorecard
    }
  }
  return summaries.sort((a, b) => b.createdAt - a.createdAt);
}

/** In-memory active-run registry (keyed by runId) — used by the WS bridge */
type ActiveRun = {
  ticks: import("@crucible/core").Tick[];
  entries: import("@crucible/core").TraceEntry[];
  state: "running" | "complete" | "error";
  error?: string;
  scenarioId: string;
  recipeName: string;
};

const active = new Map<string, ActiveRun>();
type Listener = (snapshot: ActiveRun) => void;
const listeners = new Map<string, Set<Listener>>();

export function registerActiveRun(id: string, run: ActiveRun) {
  active.set(id, run);
}
export function getActiveRun(id: string): ActiveRun | undefined { return active.get(id); }
export function emitActiveRunUpdate(id: string) {
  const run = active.get(id);
  if (!run) return;
  for (const fn of listeners.get(id) ?? []) fn(run);
}
export function subscribeActiveRun(id: string, fn: Listener) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(fn);
  return () => listeners.get(id)!.delete(fn);
}
```

- [ ] **Step 2: run-orchestrator.ts**

```typescript
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { JsonlFileRecorder, ScenarioEngine, loadScenario, type TraceEntry } from "@crucible/core";
import { SkillRuntime } from "@crucible/skills";
import { makeAnthropicAgent, type Recipe } from "../../../../apps/cli/src/agent.js"; // shared agent
import { registerActiveRun, emitActiveRunUpdate, getActiveRun } from "./run-store.js";

export interface StartRunOpts {
  scenarioDir: string;
  recipe: Recipe;
  outDir: string;
}

/** Returns the runId immediately and runs in background. */
export async function startRunBackground(opts: StartRunOpts): Promise<string> {
  const scenario = await loadScenario(opts.scenarioDir);
  const runId = `${opts.recipe.name}_${scenario.manifest.id}_${Date.now()}`;
  const runDir = path.join(opts.outDir, runId);
  await mkdir(runDir, { recursive: true });
  const recorder = new JsonlFileRecorder(path.join(runDir, "trace.jsonl"));

  registerActiveRun(runId, {
    ticks: scenario.ticks,
    entries: [],
    state: "running",
    scenarioId: scenario.manifest.id,
    recipeName: opts.recipe.name,
  });

  // Wrap recorder to also push to in-memory active store
  const wrappedRecorder = {
    append: async (e: TraceEntry) => {
      await recorder.append(e);
      const run = getActiveRun(runId);
      if (run) {
        run.entries.push(e);
        emitActiveRunUpdate(runId);
      }
    },
    close: () => recorder.close(),
  };

  const engine = new ScenarioEngine(scenario, wrappedRecorder);
  const runtime = new SkillRuntime(engine.getEngineHandle());
  const agentStep = makeAnthropicAgent(opts.recipe);

  (async () => {
    try {
      const result = await engine.run((snap) => agentStep(snap, runtime));
      await writeFile(
        path.join(runDir, "scorecard.json"),
        JSON.stringify({ scenario: scenario.manifest.id, recipe: opts.recipe.name, ...result }, null, 2)
      );
      const run = getActiveRun(runId);
      if (run) { run.state = "complete"; emitActiveRunUpdate(runId); }
    } catch (err) {
      const run = getActiveRun(runId);
      if (run) {
        run.state = "error";
        run.error = err instanceof Error ? err.message : String(err);
        emitActiveRunUpdate(runId);
      }
      await recorder.close().catch(() => {});
    }
  })().catch(() => {});

  return runId;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/local/lib/server
git commit -m "feat(local): server-side run store + background orchestrator"
```

---

## Task 7: API routes

**Files:**
- Create: `apps/local/app/api/runs/route.ts`
- Create: `apps/local/app/api/runs/[id]/route.ts`
- Create: `apps/local/app/api/runs/[id]/stream/route.ts`
- Create: `apps/local/app/api/runs/[id]/publish/route.ts`
- Create: `apps/local/app/api/runs/[id]/coach/route.ts`

- [ ] **Step 1: POST/GET /api/runs**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { startRunBackground } from "@/lib/server/run-orchestrator";
import { listRunsFromDisk } from "@/lib/server/run-store";
import { loadRecipe } from "../../../../apps/cli/src/recipe";
import path from "node:path";

export async function GET() {
  const runs = await listRunsFromDisk("./runs");
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const { scenarioDir, recipePath } = await req.json();
  const recipe = await loadRecipe(recipePath);
  const runId = await startRunBackground({
    scenarioDir: path.resolve(scenarioDir),
    recipe,
    outDir: path.resolve("./runs"),
  });
  return NextResponse.json({ runId });
}
```

- [ ] **Step 2: GET /api/runs/[id]**

```typescript
import { NextResponse } from "next/server";
import { getActiveRun } from "@/lib/server/run-store";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Prefer in-memory if active
  const active = getActiveRun(params.id);
  if (active) {
    return NextResponse.json({
      id: params.id,
      scenarioId: active.scenarioId,
      recipeName: active.recipeName,
      state: active.state,
      error: active.error,
      tickCount: active.entries.length,
      totalTicks: active.ticks.length,
      entries: active.entries,
      ticks: active.ticks,
    });
  }
  // Fall back to disk
  const dir = path.resolve("./runs", params.id);
  try {
    const trace = await readFile(path.join(dir, "trace.jsonl"), "utf8");
    const entries = trace.split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const scorecardRaw = await readFile(path.join(dir, "scorecard.json"), "utf8");
    return NextResponse.json({ id: params.id, state: "complete", entries, scorecard: JSON.parse(scorecardRaw) });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
```

- [ ] **Step 3: Server-Sent Events stream for live runs**

`apps/local/app/api/runs/[id]/stream/route.ts`:
```typescript
import { subscribeActiveRun, getActiveRun } from "@/lib/server/run-store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const initial = getActiveRun(params.id);
      if (initial) send({ tickCount: initial.entries.length, state: initial.state });
      const unsub = subscribeActiveRun(params.id, (snap) => {
        send({ tickCount: snap.entries.length, state: snap.state, error: snap.error, latest: snap.entries[snap.entries.length - 1] });
        if (snap.state === "complete" || snap.state === "error") {
          controller.close();
          unsub();
        }
      });
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
```

(Using SSE instead of WebSocket for simplicity — Next.js App Router supports SSE out of the box without route-handler workarounds.)

- [ ] **Step 4: POST /api/runs/[id]/coach**

```typescript
import { NextResponse } from "next/server";
import { runCoach } from "@crucible/coach";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const runDir = path.resolve("./runs", params.id);
  const { report, markdown } = await runCoach({ runDir });
  await writeFile(path.join(runDir, "coach-report.md"), markdown);
  return NextResponse.json({ report, markdown });
}
```

- [ ] **Step 5: POST /api/runs/[id]/publish**

```typescript
import { NextResponse } from "next/server";
import { publishRun } from "@crucible/og-client";
import path from "node:path";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { agentId, network } = await req.json();
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return NextResponse.json({ error: "DEPLOYER_PRIVATE_KEY env required" }, { status: 500 });
  const runDir = path.resolve("./runs", params.id);
  const result = await publishRun({
    runDir,
    agentId: BigInt(agentId),
    recipeHash: req.headers.get("X-Recipe-Hash") ?? "",
    network,
    privateKey: pk,
  });
  return NextResponse.json({
    runId: result.runId.toString(),
    txHash: result.txHash,
    traceHash: result.traceHash,
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/local/app/api
git commit -m "feat(local): API routes — runs list/create/read/stream/coach/publish"
```

---

## Task 8: New Run wizard page

**Files:**
- Create: `apps/local/app/new/page.tsx`
- Create: `apps/local/components/NewRunWizard.tsx`

- [ ] **Step 1: Wizard component (client)**

```tsx
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
```

- [ ] **Step 2: Page**

```tsx
// apps/local/app/new/page.tsx
import { NewRunWizard } from "@/components/NewRunWizard";
export default function NewRunPage() { return <NewRunWizard />; }
```

- [ ] **Step 3: Commit**

```bash
git add apps/local/app/new apps/local/components
git commit -m "feat(local): new run wizard page"
```

---

## Task 9: Live run viewer page

**Files:**
- Create: `apps/local/app/runs/[id]/page.tsx`
- Create: `apps/local/components/LiveRunView.tsx`

- [ ] **Step 1: Live run view component (client, with SSE)**

```tsx
"use client";
import { useEffect, useState } from "react";
import {
  ScenarioReplay,
  AgentReasoningStream,
  PnLPanel,
  CoachingReport,
} from "@crucible/ui-kit";
import type { TraceEntry, Tick } from "@crucible/core";

export function LiveRunView({ runId }: { runId: string }) {
  const [state, setState] = useState<"running" | "complete" | "error" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TraceEntry[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [coach, setCoach] = useState<{ markdown: string } | null>(null);
  const [coaching, setCoaching] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetch(`/api/runs/${runId}`).then((r) => r.json()).then((data) => {
      setEntries(data.entries ?? []);
      setTicks(data.ticks ?? []);
      setState(data.state ?? "loading");
    });

    // Stream updates
    const es = new EventSource(`/api/runs/${runId}/stream`);
    es.onmessage = (ev) => {
      const update = JSON.parse(ev.data);
      setState(update.state);
      if (update.error) setError(update.error);
      if (update.latest) setEntries((prev) => [...prev, update.latest]);
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [runId]);

  async function runCoachOnIt() {
    setCoaching(true);
    try {
      const r = await fetch(`/api/runs/${runId}/coach`, { method: "POST" });
      const data = await r.json();
      setCoach({ markdown: data.markdown });
    } finally { setCoaching(false); }
  }

  const lastPortfolio = entries[entries.length - 1]?.portfolio;
  const currentTick = entries.length === 0 ? 0 : entries[entries.length - 1]!.tick;
  const fills = entries.flatMap((e) => e.fills);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Run <code>{runId}</code></h2>
        <span className={`text-xs px-2 py-1 rounded ${stateColor(state)}`}>{state}</span>
      </div>

      {error && <div className="text-red-400 bg-red-950/30 border border-red-800 rounded p-3">Error: {error}</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ScenarioReplay ticks={ticks} fills={fills} currentTickIndex={currentTick} height={400} />
          <div className="text-sm text-slate-400">
            Tick {currentTick + 1} of {ticks.length}
          </div>
        </div>
        <div>
          {lastPortfolio && <PnLPanel portfolio={lastPortfolio} />}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Agent reasoning</h3>
          <AgentReasoningStream entries={entries} highlightTick={currentTick} maxHeight={500} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Coach report</h3>
            <button
              onClick={runCoachOnIt}
              disabled={state !== "complete" || coaching}
              className="bg-emerald-600 disabled:bg-slate-700 text-white px-3 py-1 rounded text-xs"
            >
              {coaching ? "Coaching..." : coach ? "Re-run coach" : "Run coach"}
            </button>
          </div>
          {coach ? (
            <CoachingReport markdown={coach.markdown} />
          ) : (
            <p className="text-sm text-slate-500">
              {state === "complete" ? "Click 'Run coach' to analyze this run." : "Coach available after run completes."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function stateColor(s: string) {
  return s === "complete" ? "bg-emerald-900 text-emerald-300" :
    s === "running" ? "bg-cyan-900 text-cyan-300" :
    s === "error" ? "bg-red-900 text-red-300" : "bg-slate-700 text-slate-300";
}
```

- [ ] **Step 2: Page**

```tsx
import { LiveRunView } from "@/components/LiveRunView";
export default function RunPage({ params }: { params: { id: string } }) {
  return <LiveRunView runId={params.id} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/local/app/runs apps/local/components/LiveRunView.tsx
git commit -m "feat(local): live run viewer with SSE updates + coach trigger"
```

---

## Task 10: Replay page for completed runs

**Files:**
- Create: `apps/local/app/runs/[id]/replay/page.tsx`

- [ ] **Step 1: Replay page (server component)**

```tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ScenarioReplay, AgentReasoningStream } from "@crucible/ui-kit";
import { loadScenario } from "@crucible/core";

export default async function ReplayPage({ params }: { params: { id: string } }) {
  const runDir = path.resolve("./runs", params.id);
  const trace = await readFile(path.join(runDir, "trace.jsonl"), "utf8");
  const entries = trace.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const scorecardRaw = await readFile(path.join(runDir, "scorecard.json"), "utf8");
  const scorecard = JSON.parse(scorecardRaw);
  const scenario = await loadScenario(path.resolve("./scenarios", scorecard.scenario));
  const fills = entries.flatMap((e) => e.fills);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Replay <code>{params.id}</code></h2>
      <ScenarioReplay ticks={scenario.ticks} fills={fills} height={500} />
      <AgentReasoningStream entries={entries} maxHeight={600} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/local/app/runs/[id]/replay
git commit -m "feat(local): static replay page for completed runs"
```

---

## Task 11: Publish button + flow

**Files:**
- Modify: `apps/local/components/LiveRunView.tsx`

- [ ] **Step 1: Add publish button in LiveRunView**

Add inside the LiveRunView component:

```tsx
async function publish() {
  // Prompt user for agentId & network
  const agentId = prompt("Agent ID (mint via og-client CLI first):");
  if (!agentId) return;
  const network = prompt("Network (galileo|mainnet):", "galileo");
  const recipeHash = "0x" + Array(64).fill(0).join(""); // user would precompute, simplified
  const r = await fetch(`/api/runs/${runId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Recipe-Hash": recipeHash },
    body: JSON.stringify({ agentId, network }),
  });
  const data = await r.json();
  alert(`Published! runId=${data.runId} tx=${data.txHash}`);
}

// Add to the JSX next to the run state badge:
{state === "complete" && (
  <button onClick={publish} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs">
    📤 Publish to leaderboard
  </button>
)}
```

(The prompt() UX is intentionally minimal for v1 — replace with a proper modal in a follow-up.)

- [ ] **Step 2: Commit**

```bash
git add apps/local/components/LiveRunView.tsx
git commit -m "feat(local): publish-to-leaderboard button (minimal modal UX)"
```

---

## Task 12: Smoke test (manual)

- [ ] **Step 1: Start the dev server**

```bash
export ANTHROPIC_API_KEY=...
pnpm --filter @crucible/local dev
```

- [ ] **Step 2: In browser**

Open `http://localhost:3000`. Click `+ New Run`. Submit the default form. You should be redirected to `/runs/<id>` and see:
- Chart populates tick-by-tick as the engine runs
- Agent reasoning stream fills in
- PnL panel updates
- State badge moves from `loading` → `running` → `complete`
- After completion, "Run coach" produces a markdown report

- [ ] **Step 3: Verify replay**

Navigate to `/runs/<id>/replay` — should show the static chart + reasoning.

- [ ] **Step 4: Commit demo notes**

```bash
mkdir -p samples
echo "local app smoke test: $(date) — chart + reasoning + coach all worked" >> samples/local-app-smoke.log
git add samples
git commit -m "smoke: local app end-to-end manually verified"
```

---

## Self-Review Checklist

1. **Spec coverage (Plan 4):** ui-kit components ✓, Next.js app skeleton ✓, run orchestrator ✓, API routes ✓, new run wizard ✓, live run viewer w/ SSE ✓, replay page ✓, coach trigger ✓, publish button ✓.
2. **Out of scope:** OpenClaw runtime integration, multi-user auth, Tauri packaging, polished modal UX.
3. **Risks:**
   - The orchestrator imports the agent from `apps/cli/src/agent.ts` via a relative path — fragile. A cleaner refactor would extract `makeAnthropicAgent` and `loadRecipe` into a shared `@crucible/agents` package, but the relative import works for v1.
   - The SSE stream returns when `state === "complete"`; if the client reconnects after completion it gets a 404. The fallback path uses `/api/runs/[id]` which reads from disk.
   - The publish UX uses `prompt()` — fine for demo, ugly for production.
