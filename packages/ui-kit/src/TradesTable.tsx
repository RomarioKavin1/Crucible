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
    <div className="bg-[#0f1623] border border-[#1f2a3d] rounded">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2a3d]">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5e6b80] flex items-center gap-3">
          <span className="text-[#e5e9f0]">{title}</span>
          <span className="text-[#3a4456]">·</span>
          <span><span className="text-[#10b981]">{buys}</span> buy</span>
          <span className="text-[#3a4456]">/</span>
          <span><span className="text-[#ef4444]">{sells}</span> sell</span>
        </div>
        <div className="font-mono text-[10px] tracking-[0.18em] text-[#5e6b80]">
          notional <span className="text-[#e5e9f0] tabular-nums">${formatShort(totalNotional)}</span>
        </div>
      </div>
      {fills.length === 0 ? (
        <div className="px-4 py-8 text-center font-mono text-[11px] text-[#5e6b80]">
          // no trades executed
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[50px_70px_1fr_1fr_1fr] gap-3 px-4 py-2 border-b border-[#1f2a3d] font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6b80]">
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
                className="grid grid-cols-[50px_70px_1fr_1fr_1fr] gap-3 px-4 py-1.5 border-b border-[#1f2a3d33] last:border-0 font-mono text-xs tabular-nums hover:bg-[#22d3ee06]"
              >
                <div className="text-[#5e6b80]">{f.tick}</div>
                <div style={{ color: f.side === "buy" ? "#10b981" : "#ef4444" }}>
                  {f.side === "buy" ? "▲ BUY" : "▼ SELL"}
                </div>
                <div className="text-right text-[#e5e9f0]">{f.qty}</div>
                <div className="text-right text-[#e5e9f0]">${f.price.toFixed(2)}</div>
                <div className="text-right text-[#5e6b80]">${(f.qty * f.price).toFixed(0)}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-2 border-t border-[#1f2a3d] font-mono text-[10px] uppercase tracking-[0.18em] text-[#5e6b80]">
            <div>buy notional <span className="text-[#10b981] tabular-nums normal-case ml-1">${formatShort(buyNotional)}</span></div>
            <div className="text-right">sell notional <span className="text-[#ef4444] tabular-nums normal-case ml-1">${formatShort(sellNotional)}</span></div>
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
