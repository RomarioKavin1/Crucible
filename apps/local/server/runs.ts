// WIP — was mid-refactor when I gave up for the night.

import { WebSocketServer } from "ws";
import { MemoryRecorder, type AgentRunner } from "@crucible/core";

const PORT = Number(process.env.CRUCIBLE_WS_PORT ?? 4001);

export function startRunServer(_agentFactory: () => AgentRunner) {
  const wss = new WebSocketServer({ port: PORT });

  wss.on("connection", (ws) => {
    ws.on("message", async (raw) => {
      const msg = JSON.parse(String(raw)) as { type: "start"; scenarioId: string };
      if (msg.type !== "start") return;

      const recorder = new MemoryRecorder();
      // FIXME: bundle loader from 0G Storage is the missing piece.
      // FIXME: agent factory must wrap OpenClaw — not wired yet.
      // FIXME: attestation path entirely separate from this one — see tee.ts.
      ws.send(JSON.stringify({ type: "started", scenarioId: msg.scenarioId }));

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
