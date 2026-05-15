import { describe, it, expect, vi } from "vitest";
import { RunRegistryV2Client } from "../src/run-registry-v2";

describe("RunRegistryV2Client.publish", () => {
  it("returns runId and tx hash", async () => {
    const fakeTx = {
      hash: "0xfeed",
      wait: () => Promise.resolve({
        logs: [{}],
      }),
    };
    const fakeContract: any = {
      publish: vi.fn().mockResolvedValue(fakeTx),
      interface: {
        parseLog: () => ({ name: "RunPublished", args: [19n, 42n] }),
      },
    };
    const client = RunRegistryV2Client.__forTest(fakeContract);
    const out = await client.publish({
      tokenId: 42n, scenarioId: "0x00" as any, traceRoot: "0x00" as any,
      scorecardHash: "0x00" as any, scoreSortinoE6: 1n, totalReturnE6: 1n, maxDrawdownE6: 1n,
    });
    expect(out.runId).toBe(19n);
    expect(out.txHash).toBe("0xfeed");
  });
});
