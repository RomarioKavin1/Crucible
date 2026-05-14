// packages/mcp-server/src/tools/start-run.test.ts
import { describe, it, expect, vi } from "vitest";
import { ethers } from "ethers";
import { handleStartRun } from "./start-run";
import { buildDomain, START_RUN_TYPES } from "../auth";

describe("handleStartRun", () => {
  it("rejects an unauthorized signer", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const payload = { scenarioId: "tiny", tokenId: 42n, nonce: 1n };
    const sig = await wallet.signTypedData(domain, START_RUN_TYPES, payload);
    const inft = { isAuthorized: vi.fn().mockResolvedValue(false) } as any;
    const reg: any = { create: vi.fn() };
    const startEngine = vi.fn();
    await expect(handleStartRun({
      domain, inft, registry: reg, startEngine,
      input: { scenarioId: "tiny", tokenId: "42", nonce: "1", signature: sig, signer: wallet.address },
    })).rejects.toThrow(/UNAUTHORIZED/);
  });

  it("rejects a bad signature (signer mismatch)", async () => {
    const wallet = ethers.Wallet.createRandom();
    const otherWallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const payload = { scenarioId: "tiny", tokenId: 42n, nonce: 1n };
    const sig = await wallet.signTypedData(domain, START_RUN_TYPES, payload);
    const inft = { isAuthorized: vi.fn().mockResolvedValue(true) } as any;
    const reg: any = { create: vi.fn() };
    await expect(handleStartRun({
      domain, inft, registry: reg, startEngine: vi.fn(),
      input: { scenarioId: "tiny", tokenId: "42", nonce: "1", signature: sig, signer: otherWallet.address },
    })).rejects.toThrow(/BAD_SIGNATURE/);
  });

  it("creates a session and returns the first observation when authorized", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const payload = { scenarioId: "tiny", tokenId: 42n, nonce: 1n };
    const sig = await wallet.signTypedData(domain, START_RUN_TYPES, payload);
    const inft = { isAuthorized: vi.fn().mockResolvedValue(true) } as any;
    const fakeEngine: any = {
      currentObservation: () => ({ tickId: 0, price: 100, ticksRemaining: 10 }),
    };
    const startEngine = vi.fn().mockResolvedValue(fakeEngine);
    const reg: any = { create: vi.fn().mockReturnValue("0xrun123") };
    const out = await handleStartRun({
      domain, inft, registry: reg, startEngine,
      input: { scenarioId: "tiny", tokenId: "42", nonce: "1", signature: sig, signer: wallet.address },
    });
    expect(out.runId).toBe("0xrun123");
    expect(out.ticksRemaining).toBe(10);
    expect(out.observation.tickId).toBe(0);
    expect(reg.create).toHaveBeenCalledWith(expect.objectContaining({ tokenId: 42n, scenarioId: "tiny" }));
  });
});
