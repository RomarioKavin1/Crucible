import type { Fill } from "@crucible/core";

export interface TradesTableProps {
  fills: Fill[];
  maxHeight?: number;
  /** Optional title override; defaults to "Trades" */
  title?: string;
}

export function TradesTable({ fills, maxHeight = 320, title = "Trades" }: TradesTableProps) {
  const buys = fills.filter((f) => f.side === "buy").length;
  const sells = fills.filter((f) => f.side === "sell").length;
  const totalNotional = fills.reduce((sum, f) => sum + f.qty * f.price, 0);
  const buyNotional = fills.filter((f) => f.side === "buy").reduce((s, f) => s + f.qty * f.price, 0);
  const sellNotional = fills.filter((f) => f.side === "sell").reduce((s, f) => s + f.qty * f.price, 0);

  return (
    <div className="bg-[#0f1623] border border-[#1c2538] rounded-xl overflow-hidden card-elevated">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2538]">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-[#e6e9f0]">{title}</span>
          <span className="h-3 w-px bg-[#232d44]" />
          <span className="text-[11px] text-[#aab2c5]">
            <span className="text-[#10b981] font-mono">{buys}</span> buy · <span className="text-[#ef4444] font-mono">{sells}</span> sell
          </span>
        </div>
        <span className="text-[11px] text-[#6b7691]">
          notional <span className="text-[#e6e9f0] font-mono">${formatShort(totalNotional)}</span>
        </span>
      </div>
      {fills.length === 0 ? (
        <div className="px-4 py-10 text-center text-[12px] text-[#6b7691]">No trades executed</div>
      ) : (
        <>
          <div className="grid grid-cols-[60px_80px_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-b border-[#1c2538] text-[10px] uppercase tracking-[0.12em] text-[#6b7691] font-medium">
            <div>Tick</div>
            <div>Side</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Price</div>
            <div className="text-right">Notional</div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight }}>
            {fills.map((f, i) => (
              <div
                key={i}
                className="grid grid-cols-[60px_80px_1fr_1fr_1fr] gap-3 px-4 py-2 border-b border-[#1c253855] last:border-0 text-[12px] hover:bg-[#ffffff03] transition-colors"
              >
                <div className="font-mono text-[#6b7691]">{f.tick}</div>
                <div className="flex items-center gap-1" style={{ color: f.side === "buy" ? "#10b981" : "#ef4444" }}>
                  <span className="text-[10px]">{f.side === "buy" ? "▲" : "▼"}</span>
                  <span className="font-medium tracking-wide">{f.side === "buy" ? "BUY" : "SELL"}</span>
                </div>
                <div className="text-right font-mono text-[#e6e9f0]">{f.qty}</div>
                <div className="text-right font-mono text-[#e6e9f0]">${f.price.toFixed(2)}</div>
                <div className="text-right font-mono text-[#aab2c5]">${(f.qty * f.price).toFixed(0)}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-2.5 border-t border-[#1c2538] text-[11px] text-[#6b7691]">
            <div>Buy notional <span className="text-[#10b981] font-mono ml-1">${formatShort(buyNotional)}</span></div>
            <div className="text-right">Sell notional <span className="text-[#ef4444] font-mono ml-1">${formatShort(sellNotional)}</span></div>
          </div>
        </>
      )}
    </div>
  );
}

function formatShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(0);
}
