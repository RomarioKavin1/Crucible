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
