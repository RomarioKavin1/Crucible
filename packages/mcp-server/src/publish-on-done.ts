// packages/mcp-server/src/publish-on-done.ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ethers } from "ethers";
import { publishRunV3 } from "@crucible/og-client";
import type { SessionRegistry, CreateOpts } from "./session";
import type { ServerConfig } from "./config";

/**
 * Wraps SessionRegistry.create so newly-created sessions auto-publish on engine completion.
 * Listens to the per-session "done" event (emitted by handleNextTick when isDone()==true)
 * and uploads the trace + scorecard to 0G Storage + records on RunRegistryV2.
 *
 * Emits "published" or "publish_failed" on the session events.
 */
export function registerPublishOnDone(sessions: SessionRegistry, cfg: ServerConfig) {
  const origCreate = sessions.create.bind(sessions);
  sessions.create = ((opts: CreateOpts) => {
    const runId = origCreate(opts);
    const sess = sessions.get(runId);
    sess.events.on("done", async (ev: any) => {
      try {
        const dir = await mkdtemp(path.join(tmpdir(), `run-${runId.slice(2, 10)}-`));
        await writeFile(path.join(dir, "trace.jsonl"), ev.traceJsonl ?? "");
        // publishRunV3 expects scorecard.json with shape { scenario, scorecard:{...} }
        // — adapt by wrapping the engine's flat scorecard.
        const wrapped = { scenario: sess.scenarioId, scorecard: ev.scorecard };
        await writeFile(path.join(dir, "scorecard.json"), JSON.stringify(wrapped));
        const result = await publishRunV3({
          runDir: dir,
          tokenId: sess.tokenId,
          network: cfg.network,
          privateKey: cfg.publisherPrivateKey,
          model: sess.model,
          framework: sess.framework,
          agentVersion: sess.agentVersion,
        });
        sess.events.emit("published", {
          runId: result.runId.toString(),
          txHash: result.txHash,
          url: `${cfg.webPublicUrl}/runs/${result.runId.toString()}`,
        });
        sessions.markCompleted(runId);
      } catch (err) {
        sess.events.emit("publish_failed", { error: String(err) });
      }
    });
    return runId;
  }) as any;
}
