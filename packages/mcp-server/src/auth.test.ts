// packages/mcp-server/src/auth.test.ts
import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { recoverActionSigner, ACTION_TYPES, buildDomain } from "./auth";

describe("recoverActionSigner", () => {
  it("recovers the signer of a valid EIP-712 Action", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = {
      runId: "0x" + "11".repeat(32),
      tickId: 1,
      kind: "market_buy",
      qty: 100n,
      reasoning: "starter long",
      nonce: 1n,
    };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const recovered = recoverActionSigner(domain, action, sig);
    expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase());
  });

  it("returns a different address if signature is wrong", async () => {
    const wallet = ethers.Wallet.createRandom();
    const domain = buildDomain(16602, "0x" + "ab".repeat(20));
    const action = { runId: "0x" + "11".repeat(32), tickId: 1, kind: "noop", qty: 0n, reasoning: "", nonce: 1n };
    const sig = await wallet.signTypedData(domain, ACTION_TYPES, action);
    const tampered = { ...action, kind: "market_buy" };
    const recovered = recoverActionSigner(domain, tampered, sig);
    expect(recovered.toLowerCase()).not.toBe(wallet.address.toLowerCase());
  });
});
