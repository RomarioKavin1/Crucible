"use client";

interface Frame {
  type: string;
  payload?: any;
  ts?: number;
}

export function LiveRunReplay({ frames }: { frames: Frame[] }) {
  const ticks = frames.filter((f) => f.type === "tick").map((f) => f.payload);
  const last = ticks[ticks.length - 1];
  const lastObs = last?.action?.observation;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="space-y-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Latest tick</h3>
          {ticks.length === 0
            ? <p className="text-zinc-500 text-sm">No ticks yet — waiting for agent to call next_tick.</p>
            : (
              <div className="space-y-1 text-sm">
                <div>Tick #{last?.tickId} of {(last?.tickId ?? 0) + (lastObs?.ticksRemaining ?? 0)}</div>
                <div>Action: <code>{last?.action?.kind} qty={last?.action?.qty}</code></div>
                {last?.action?.reasoning && <div className="text-zinc-600 italic">"{last.action.reasoning}"</div>}
                {last?.fill?.fill && <div className="text-zinc-600">Fill: {last.fill.fill.qty} @ {last.fill.fill.price}</div>}
              </div>
            )
          }
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Position & equity</h3>
          {lastObs ? (
            <div className="space-y-1 text-sm">
              <div>Price: ${lastObs.price?.toFixed?.(2) ?? lastObs.price}</div>
              <div>Position: {lastObs.position}</div>
              <div>Cash: ${lastObs.cash?.toFixed?.(2) ?? lastObs.cash}</div>
              <div>Equity: ${lastObs.equity?.toFixed?.(2) ?? lastObs.equity}</div>
            </div>
          ) : <p className="text-zinc-500 text-sm">—</p>}
        </div>
      </section>
      <section>
        <h3 className="font-semibold mb-2">Reasoning stream</h3>
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {ticks.map((t, i) => (
            <li key={i} className="text-sm border-l-2 border-zinc-300 pl-3">
              <div className="font-mono text-xs text-zinc-500">tick {t.tickId} · {t.action?.kind}</div>
              <div>{t.action?.reasoning || "(no reasoning)"}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
