import { describe, it, expect, vi } from "vitest";
import { AgentINFTClient } from "../src/agent-inft";

describe("AgentINFTClient.mint", () => {
  it("parses tokenId from AgentMinted event", async () => {
    const fakeReceipt = {
      logs: [{ topics: [], data: "0x" }],
    };
    const fakeTx = { hash: "0xabc", wait: () => Promise.resolve(fakeReceipt) };
    const fakeContract: any = {
      mint: vi.fn().mockResolvedValue(fakeTx),
      interface: {
        parseLog: () => ({ name: "AgentMinted", args: [42n, "0xowner", "desc", "0x00"] }),
      },
    };
    const client = AgentINFTClient.__forTest(fakeContract);
    const out = await client.mint("desc", "0x00" as any);
    expect(out.tokenId).toBe(42n);
    expect(out.txHash).toBe("0xabc");
  });
});
