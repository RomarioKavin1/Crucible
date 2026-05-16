// packages/mcp-server/src/publish-on-done.ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { publishRunV3 } from "@crucible/og-client";
import type { SessionRegistry, CreateOpts } from "./session";
import type { ServerConfig } from "./config";
import { networkOf } from "./config";

/**
 * Wraps SessionRegistry.create so newly-created sessions auto-publish on
 * engine completion. Routes via the session's network — each run lands on
 * the contract for the network it was started against.
 */
export function registerPublishOnDone(sessions: SessionRegistry, cfg: ServerConfig) {
  const origCreate = sessions.create.bind(sessions);
  sessions.create = ((opts: CreateOpts) => {
    const runId = origCreate(opts);
    const sess = sessions.get(runId);
    sess.events.on("done", async (ev: any) => {
      const t0 = Date.now();
      const tag = `[publish run=${runId.slice(2, 10)} net=${sess.network} token=${sess.tokenId.toString()}]`;
      try {
        const net = networkOf(cfg, sess.network);
        console.log(`${tag} start (publisher=${net.publisher.address})`);

        const dir = await mkdtemp(path.join(tmpdir(), `run-${runId.slice(2, 10)}-`));
        const meta = JSON.stringify({
          type: "meta",
          schema: 1,
          network: sess.network,
          tokenId: sess.tokenId.toString(),
          scenarioId: sess.scenarioId,
          signer: sess.signer,
          model: sess.model,
          framework: sess.framework,
          agentVersion: sess.agentVersion,
          provider: sess.provider,
          systemPrompt: sess.systemPrompt,
          startedAt: new Date(sess.createdAt).toISOString(),
        });
        const traceWithMeta = `${meta}\n${ev.traceJsonl ?? ""}`;
        await writeFile(path.join(dir, "trace.jsonl"), traceWithMeta);

        const wrapped = { scenario: sess.scenarioId, scorecard: ev.scorecard };
        await writeFile(path.join(dir, "scorecard.json"), JSON.stringify(wrapped));

        console.log(`${tag} uploading trace + scorecard to 0G Storage…`);
        const result = await publishRunV3({
          runDir: dir,
          tokenId: sess.tokenId,
          network: sess.network,
          privateKey: net.publisherPrivateKey,
          model: sess.model,
          framework: sess.framework,
          agentVersion: sess.agentVersion,
        });

        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`${tag} published runId=${result.runId.toString()} txHash=${result.txHash} in ${dt}s`);

        sess.events.emit("published", {
          runId: result.runId.toString(),
          txHash: result.txHash,
          url: `${cfg.webPublicUrl}/runs/${result.runId.toString()}?network=${sess.network}`,
        });
        sessions.markCompleted(runId);
      } catch (err) {
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        console.error(`${tag} FAILED after ${dt}s:`, err);
        sess.events.emit("publish_failed", { error: String(err) });
      }
    });
    return runId;
  }) as any;
}
