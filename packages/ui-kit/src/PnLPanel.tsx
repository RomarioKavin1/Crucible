import type { Portfolio } from "@crucible/core";

export interface PnLPanelProps {
  portfolio: Portfolio;
  /** Optional starting equity to compute return % for the equity bar. Defaults to 10000. */
  initialEquity?: number;
  /** Current price of the asset, for computing equity. Defaults to 1 (assumes position*1 = position). */
  currentPrice?: number;
}

function fmtUsd(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PnLPanel({ portfolio, initialEquity = 10000, currentPrice = 1 }: PnLPanelProps) {
  const equity = portfolio.cash + portfolio.position * currentPrice;
  const returnPct = (equity - initialEquity) / initialEquity;
  const returnSign = returnPct >= 0 ? "+" : "";
  const returnColor = returnPct >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="bg-[#0f1623] border border-[#1f2a3d] rounded p-4 space-y-4">
      <div>
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#5e6b80] mb-1">Equity</div>
        <div className="font-mono text-2xl tabular-nums text-[#e5e9f0]">{fmtUsd(equity)}</div>
        <div className="mt-2 h-0.5 bg-[#1f2a3d] rounded-full overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${Math.min(100, Math.max(0, 50 + returnPct * 500))}%`,
              background: returnColor,
            }}
          />
        </div>
        <div className="font-mono text-xs mt-1 tabular-nums" style={{ color: returnColor }}>
          {returnSign}{(returnPct * 100).toFixed(2)}%
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Position" value={portfolio.position.toString()} />
        <Stat label="Cash" value={fmtUsd(portfolio.cash)} />
        <Stat
          label="Realized"
          value={fmtUsd(portfolio.realizedPnl)}
          color={portfolio.realizedPnl >= 0 ? "#10b981" : "#ef4444"}
        />
        <Stat
          label="Drawdown"
          value={`${(Math.abs(portfolio.drawdownPct) * 100).toFixed(2)}%`}
          color={portfolio.drawdownPct < -0.05 ? "#ef4444" : "#5e6b80"}
          arrow={portfolio.drawdownPct < 0 ? "▼" : undefined}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, color, arrow }: { label: string; value: string; color?: string; arrow?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#5e6b80] mb-0.5">{label}</div>
      <div className="font-mono tabular-nums flex items-baseline gap-1" style={{ color: color ?? "#e5e9f0" }}>
        <span>{value}</span>
        {arrow && <span className="text-xs">{arrow}</span>}
      </div>
    </div>
  );
}
