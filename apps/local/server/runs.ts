// Local backend that the local Next app drives. Exposes a WebSocket which
// streams each TraceEntry as the scenario engine produces it.

import { WebSocketServer } from "ws";
import { run as runEngine, MemoryRecorder, type AgentRunner } from "@crucible/core";

const PORT = Number(process.env.CRUCIBLE_WS_PORT ?? 4001);

export function startRunServer(_agentFactory: () => AgentRunner) {
  const wss = new WebSocketServer({ port: PORT });

  wss.on("connection", (ws) => {
    ws.on("message", async (raw) => {
      const msg = JSON.parse(String(raw)) as { type: "start"; scenarioId: string };
      if (msg.type !== "start") return;

      const recorder = new MemoryRecorder();
      // TODO: load real ScenarioSource from disk / 0G Storage and a real agent.
      // For now this is a stub — wires will get connected once the bundle
      // loader lands.
      ws.send(JSON.stringify({ type: "started", scenarioId: msg.scenarioId }));

      // Stream entries as they're recorded.
      const origAppend = recorder.append.bind(recorder);
      recorder.append = (entry) => {
        origAppend(entry);
        ws.send(JSON.stringify({ type: "tick", entry }));
      };

      ws.send(JSON.stringify({ type: "done" }));
    });
  });

  return wss;
}

if (process.argv[1]?.endsWith("runs.ts")) {
  startRunServer(() => {
    throw new Error("agent factory not configured");
  });
  console.log(`Crucible run server listening on ws://localhost:${PORT}`);
}
