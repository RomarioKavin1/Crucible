"use client";
import { useEffect, useState } from "react";

interface TickMsg {
  type: "tick";
  entry: { tick: number; ts: string; portfolio: { cash: number; position: number } };
}

export default function RunPage() {
  const [ticks, setTicks] = useState<TickMsg["entry"][]>([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4001");
    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "start", scenarioId: "eth-trump-tariff-apr2025" }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as TickMsg | { type: string };
      if (msg.type === "tick") setTicks((t) => [...t, (msg as TickMsg).entry]);
    };
    return () => ws.close();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "ui-monospace, monospace" }}>
      <h1>Live run</h1>
      <pre>{JSON.stringify(ticks.slice(-10), null, 2)}</pre>
    </main>
  );
}
