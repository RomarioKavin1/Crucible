// packages/mcp-server/src/tools/next-tick.test.ts
import { describe, it, expect, vi } from "vitest";
import { ethers } from "ethers";
import { handleNextTick } from "./next-tick";
import { buildDomain, ACTION_TYPES } from "../auth";

describe("handleNextTick", () => {
  it("rejects bad nonce", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = { runId: "0x" + "11".repeat(32), tickId: 1, kind: "noop", qty: 0n, reasoning: "", nonce: 5n };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const inft = { isAuthorized: vi.fn().mockResolvedValue(true) } as any;
    const sess: any = {
      tokenId: 1n, signer: wallet.address.toLowerCase(),
      engine: {
        applyAction: vi.fn(), advance: vi.fn(), isDone: () => false,
        currentObservation: () => ({ tickId: 2, ticksRemaining: 1 }),
      },
      events: { emit: vi.fn() },
    };
    const registry: any = {
      get: () => sess,
      checkAndAdvanceNonce: vi.fn().mockReturnValue(false),  // bad nonce
    };
    await expect(handleNextTick({
      domain, inft, registry,
      input: {
        runId: action.runId, tickId: 1, kind: "noop", qty: "0",
        reasoning: "", nonce: "5", signature: sig, signer: wallet.address,
      },
    })).rejects.toThrow(/BAD_NONCE/);
  });

  it("rejects bad signature", async () => {
    const wallet = ethers.Wallet.createRandom();
    const otherWallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = { runId: "0x" + "11".repeat(32), tickId: 1, kind: "noop", qty: 0n, reasoning: "", nonce: 1n };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const sess: any = { tokenId: 1n, signer: wallet.address.toLowerCase(), engine: {}, events: { emit: vi.fn() } };
    const registry: any = { get: () => sess };
    await expect(handleNextTick({
      domain, inft: {} as any, registry,
      input: {
        runId: action.runId, tickId: 1, kind: "noop", qty: "0",
        reasoning: "", nonce: "1", signature: sig, signer: otherWallet.address,
      },
    })).rejects.toThrow(/BAD_SIGNATURE/);
  });

  it("applies action and returns next observation", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = { runId: "0x" + "11".repeat(32), tickId: 1, kind: "market_buy", qty: BigInt(1e18), reasoning: "test", nonce: 1n };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const fakeFill = { side: "buy", qty: 1, price: 100 };
    const sess: any = {
      tokenId: 1n, signer: wallet.address.toLowerCase(),
      engine: {
        applyAction: vi.fn().mockReturnValue({ fill: fakeFill }),
        advance: vi.fn(),
        isDone: () => false,
        currentObservation: () => ({ tickId: 2, ticksRemaining: 1 }),
      },
      events: { emit: vi.fn() },
    };
    const registry: any = {
      get: () => sess,
      checkAndAdvanceNonce: vi.fn().mockReturnValue(true),
    };
    const inft = { isAuthorized: vi.fn().mockResolvedValue(true) } as any;
    const out = await handleNextTick({
      domain, inft, registry,
      input: {
        runId: action.runId, tickId: 1, kind: "market_buy", qty: action.qty.toString(),
        reasoning: "test", nonce: "1", signature: sig, signer: wallet.address,
      },
    });
    expect(out.done).toBe(false);
    expect(out.tickId).toBe(1);
    expect(out.fill).toEqual({ fill: fakeFill });
    expect(out.observation?.tickId).toBe(2);
    expect(out.ticksRemaining).toBe(1);
  });

  it("returns done with scorecard when engine completes", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = { runId: "0x" + "11".repeat(32), tickId: 99, kind: "noop", qty: 0n, reasoning: "", nonce: 99n };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const fakeScorecard = { sortino: 0.5 };
    const sess: any = {
      tokenId: 1n, signer: wallet.address.toLowerCase(),
      engine: {
        applyAction: vi.fn().mockReturnValue({}),
        advance: vi.fn(),
        isDone: () => true,
        finalize: vi.fn().mockReturnValue({ scorecard: fakeScorecard, traceJsonl: "trace\n" }),
      },
      events: { emit: vi.fn() },
    };
    const registry: any = {
      get: () => sess,
      checkAndAdvanceNonce: vi.fn().mockReturnValue(true),
    };
    const inft = { isAuthorized: vi.fn().mockResolvedValue(true) } as any;
    const out = await handleNextTick({
      domain, inft, registry,
      input: {
        runId: action.runId, tickId: 99, kind: "noop", qty: "0",
        reasoning: "", nonce: "99", signature: sig, signer: wallet.address,
      },
    });
    expect(out.done).toBe(true);
    expect(out.scorecard).toEqual(fakeScorecard);
    expect(out.ticksRemaining).toBe(0);
  });
});
