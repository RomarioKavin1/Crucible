"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface V2Row {
  runId: string;
  tokenId: string;
  agentDescription: string;
  scenarioId: string;
  scenarioName: string | null;
  sortino: number;
  totalReturn: number;
  maxDrawdown: number;
  timestamp: number;
  recordedBy: string;
  model: string;
  framework: string;
  agentVersion: string;
}

type SortKey = "sortino" | "return" | "drawdown" | "recency";
type ViewMode = "all" | "best";

const SORT_OPTIONS: { key: SortKey; label: string; help: string }[] = [
  { key: "sortino",  label: "Sortino",  help: "Risk-adjusted return — bigger is better" },
  { key: "return",   label: "Return",   help: "Total % return — bigger is better" },
  { key: "drawdown", label: "Drawdown", help: "Worst peak-to-trough drop — smaller is better" },
  { key: "recency",  label: "Newest",   help: "Most recently published" },
];

function sortRows(rows: V2Row[], key: SortKey): V2Row[] {
  const out = rows.slice();
  switch (key) {
    case "sortino":  return out.sort((a, b) => b.sortino - a.sortino);
    case "return":   return out.sort((a, b) => b.totalReturn - a.totalReturn);
    case "drawdown": return out.sort((a, b) => Math.abs(a.maxDrawdown) - Math.abs(b.maxDrawdown));
    case "recency":  return out.sort((a, b) => b.timestamp - a.timestamp);
  }
}

function bestPerAgent(rows: V2Row[], key: SortKey): V2Row[] {
  const ranked = sortRows(rows, key);
  const seen = new Set<string>();
  const out: V2Row[] = [];
  for (const r of ranked) {
    if (seen.has(r.tokenId)) continue;
    seen.add(r.tokenId);
    out.push(r);
  }
  return out;
}

function formatAgo(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function LeaderboardClient({
  rows,
  scenarios,
}: {
  rows: V2Row[];
  scenarios: { id: string; title: string }[];
}) {
  const [sort, setSort] = useState<SortKey>("sortino");
  const [view, setView] = useState<ViewMode>("all");
  const [scenarioFilter, setScenarioFilter] = useState<string | "all">("all");
  const [modelFilter, setModelFilter] = useState<string | "all">("all");

  const knownModels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = r.model || "unknown";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (scenarioFilter !== "all") out = out.filter((r) => r.scenarioName === scenarioFilter);
    if (modelFilter !== "all") out = out.filter((r) => (r.model || "unknown") === modelFilter);
    return out;
  }, [rows, scenarioFilter, modelFilter]);

  const ordered = useMemo(
    () => (view === "best" ? bestPerAgent(filtered, sort) : sortRows(filtered, sort)),
    [filtered, sort, view],
  );

  const scenariosWithCounts = useMemo(() => {
    return scenarios
      .map((s) => ({ ...s, count: rows.filter((r) => r.scenarioName === s.id).length }))
      .filter((s) => s.count > 0);
  }, [scenarios, rows]);

  return (
    <div className="space-y-8">
      {/* ─── Filters — editorial typography, no pill chips ─────────── */}
      <div className="space-y-5">
        <FilterRow
          label="View"
          items={[
            { id: "all",  label: "All runs",       active: view === "all",  onClick: () => setView("all") },
            { id: "best", label: "Best per agent", active: view === "best", onClick: () => setView("best") },
          ]}
        />

        <FilterRow
          label="Sort"
          items={SORT_OPTIONS.map((o) => ({
            id: o.key,
            label: o.label,
            active: sort === o.key,
            onClick: () => setSort(o.key),
          }))}
        />

        {scenariosWithCounts.length > 0 && (
          <FilterRow
            label="Scenario"
            items={[
              { id: "all", label: `All · ${rows.length}`, active: scenarioFilter === "all", onClick: () => setScenarioFilter("all") },
              ...scenariosWithCounts.map((s) => ({
                id: s.id,
                label: `${s.title} · ${s.count}`,
                active: scenarioFilter === s.id,
                onClick: () => setScenarioFilter(s.id),
              })),
            ]}
          />
        )}

        {knownModels.length > 1 && (
          <FilterRow
            label="Model"
            items={[
              { id: "all", label: `All · ${rows.length}`, active: modelFilter === "all", onClick: () => setModelFilter("all") },
              ...knownModels.map(([m, count]) => ({
                id: m,
                label: `${m} · ${count}`,
                active: modelFilter === m,
                onClick: () => setModelFilter(m),
              })),
            ]}
          />
        )}
      </div>

      {/* ─── Table — borderless, hairline rows ─────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-y border-border-subtle">
              <Th className="w-12 text-right pr-3">#</Th>
              <Th>Agent</Th>
              <Th>Model</Th>
              <Th>Scenario</Th>
              <Th align="right" sortable active={sort === "sortino"} onClick={() => setSort("sortino")}>
                Sortino
              </Th>
              <Th align="right" sortable active={sort === "return"} onClick={() => setSort("return")}>
                Return
              </Th>
              <Th align="right" sortable active={sort === "drawdown"} onClick={() => setSort("drawdown")}>
                Drawdown
              </Th>
              <Th align="right" sortable active={sort === "recency"} onClick={() => setSort("recency")}>
                Published
              </Th>
              <Th align="right">Audit</Th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r, i) => {
              const returnColor = r.totalReturn >= 0 ? "text-up" : "text-down";
              return (
                <tr
                  key={r.runId}
                  className="border-b border-border-subtle hover:bg-surface-1/40 transition-colors duration-fast ease-out-quart group"
                >
                  <td className="py-5 pr-3 text-right font-mono text-[12px] text-ink-4 tabular-nums align-middle">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="py-5 pr-5 align-middle">
                    <Link href={`/runs/${r.runId}`} className="block">
                      <div className="text-[15px] text-ink group-hover:text-accent transition-colors duration-fast ease-out-quart leading-tight">
                        {r.agentDescription || <span className="text-ink-3 italic">Unnamed agent</span>}
                      </div>
                      <div className="text-[11.5px] text-ink-3 font-mono mt-1 flex items-center gap-2">
                        <span className="text-accent">INFT #{r.tokenId}</span>
                        <span className="text-ink-4">·</span>
                        <span title={r.recordedBy}>{shortAddr(r.recordedBy)}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="py-5 pr-5 align-middle">
                    {r.model ? (
                      <div className="leading-tight">
                        <div className="font-mono text-[12px] text-ink">{r.model}</div>
                        {(r.framework || r.agentVersion) && (
                          <div className="text-[10.5px] text-ink-3 font-mono mt-0.5">
                            {r.framework}{r.framework && r.agentVersion ? " · " : ""}{r.agentVersion}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11.5px] text-ink-4 italic">unknown</span>
                    )}
                  </td>
                  <td className="py-5 pr-5 align-middle">
                    {r.scenarioName ? (
                      <Link href={`/scenarios/${r.scenarioName}`} className="font-mono text-[12.5px] text-ink-2 hover:text-accent transition-colors duration-fast">
                        {r.scenarioName}
                      </Link>
                    ) : (
                      <span className="font-mono text-[11.5px] text-ink-4" title={r.scenarioId}>
                        {r.scenarioId.slice(0, 10)}…
                      </span>
                    )}
                  </td>
                  <td className="py-5 pr-5 text-right align-middle">
                    <span className={`font-mono tabular-nums tracking-tight ${
                      sort === "sortino" ? "text-[20px] text-ink" : "text-[14px] text-ink-2"
                    }`}>
                      {r.sortino.toFixed(3)}
                    </span>
                  </td>
                  <td className={`py-5 pr-5 text-right align-middle font-mono tabular-nums ${returnColor}`}>
                    <span className="text-ink-4 mr-1 text-[10px]">{r.totalReturn >= 0 ? "▲" : "▼"}</span>
                    <span className={sort === "return" ? "text-[18px]" : "text-[14px]"}>
                      {Math.abs(r.totalReturn).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-5 pr-5 text-right align-middle font-mono tabular-nums text-down">
                    <span className={sort === "drawdown" ? "text-[18px]" : "text-[14px]"}>
                      −{Math.abs(r.maxDrawdown).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-5 pr-5 text-right align-middle text-[12px] text-ink-3 whitespace-nowrap font-mono">
                    <div title={new Date(r.timestamp * 1000).toISOString()}>
                      {formatAgo(Date.now() - r.timestamp * 1000)}
                    </div>
                    <div className="text-[10.5px] text-ink-4 mt-0.5">#{r.runId}</div>
                  </td>
                  <td className="py-5 text-right align-middle whitespace-nowrap">
                    <Link
                      href={`/verify/${r.runId}`}
                      className="editorial-link text-[12.5px] font-medium"
                    >
                      Verify →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ordered.length === 0 && (
          <div className="py-16 text-center text-[13px] text-ink-3">
            No runs match the current filter.
          </div>
        )}
      </div>

      {/* ─── Footnote: metric definitions, editorial type ──────────── */}
      <footer className="pt-8 border-t border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
        <MetricFootnote name="Sortino" formula="return / downside-deviation">
          Risk-adjusted return penalising only <em>downside</em> volatility. Higher is better.
          Used as the default rank.
        </MetricFootnote>
        <MetricFootnote name="Return" formula="(end − start) / start">
          Total profit or loss as a percentage of the $10,000 starting cash. Higher is better.
        </MetricFootnote>
        <MetricFootnote name="Drawdown" formula="max((peak − trough) / peak)">
          The worst peak-to-trough equity drop the agent suffered. Closer to zero is better.
        </MetricFootnote>
      </footer>
    </div>
  );
}

function FilterRow({
  label,
  items,
}: {
  label: string;
  items: { id: string; label: string; active: boolean; onClick: () => void }[];
}) {
  return (
    <div className="flex items-baseline gap-5 flex-wrap">
      <span className="text-eyebrow w-14 shrink-0">{label}</span>
      <div className="flex items-baseline gap-4 flex-wrap">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={it.onClick}
            className={`text-[13px] transition-colors duration-fast ease-out-quart ${
              it.active
                ? "text-ink font-medium underline underline-offset-4 decoration-accent decoration-2"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className = "",
  sortable,
  active,
  onClick,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  sortable?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = `text-eyebrow py-4 ${align === "right" ? "text-right pr-5" : ""} ${className}`;
  if (sortable) {
    return (
      <th className={cls}>
        <button
          type="button"
          onClick={onClick}
          className={`uppercase tracking-[0.12em] transition-colors duration-fast ease-out-quart ${
            active ? "text-ink" : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {children}
          {active && <span className="ml-1 text-[8px]">▼</span>}
        </button>
      </th>
    );
  }
  return <th className={cls}>{children}</th>;
}

function MetricFootnote({
  name,
  formula,
  children,
}: {
  name: string;
  formula: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[14px] text-ink font-medium">{name}</div>
      <div className="font-mono text-[11px] text-accent mt-0.5">{formula}</div>
      <div className="text-[12.5px] text-ink-2 mt-2 leading-relaxed">{children}</div>
    </div>
  );
}
