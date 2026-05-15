// packages/mcp-server/src/auth.ts
import { ethers } from "ethers";
import { AgentINFTClient } from "@crucible/og-client";

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export const ACTION_TYPES: Record<string, ethers.TypedDataField[]> = {
  Action: [
    { name: "runId",     type: "bytes32" },
    { name: "tickId",    type: "uint32"  },
    { name: "kind",      type: "string"  },
    { name: "qty",       type: "uint256" },
    { name: "reasoning", type: "string"  },
    { name: "nonce",     type: "uint256" },
  ],
};

export const START_RUN_TYPES: Record<string, ethers.TypedDataField[]> = {
  StartRun: [
    { name: "scenarioId", type: "string"  },
    { name: "tokenId",    type: "uint256" },
    { name: "nonce",      type: "uint256" },
  ],
};

export const ABORT_RUN_TYPES: Record<string, ethers.TypedDataField[]> = {
  AbortRun: [
    { name: "runId",  type: "bytes32" },
    { name: "reason", type: "string"  },
    { name: "nonce",  type: "uint256" },
  ],
};

export function buildDomain(chainId: number, verifyingContract: string): EIP712Domain {
  return { name: "CrucibleBench", version: "2", chainId, verifyingContract };
}

export interface Action {
  runId: string;
  tickId: number;
  kind: string;
  qty: bigint;
  reasoning: string;
  nonce: bigint;
}

export function recoverActionSigner(domain: EIP712Domain, action: Action, signature: string): string {
  return ethers.verifyTypedData(domain, ACTION_TYPES, action, signature);
}

export interface StartRunPayload {
  scenarioId: string;
  tokenId: bigint;
  nonce: bigint;
}

export function recoverStartRunSigner(domain: EIP712Domain, payload: StartRunPayload, signature: string): string {
  return ethers.verifyTypedData(domain, START_RUN_TYPES, payload, signature);
}

export interface AbortRunPayload {
  runId: string;
  reason: string;
  nonce: bigint;
}

export function recoverAbortRunSigner(domain: EIP712Domain, payload: AbortRunPayload, signature: string): string {
  return ethers.verifyTypedData(domain, ABORT_RUN_TYPES, payload, signature);
}

export interface AuthorizeOpts {
  inft: AgentINFTClient;
  tokenId: bigint;
  signer: string;
}

export async function isAuthorizedForToken({ inft, tokenId, signer }: AuthorizeOpts): Promise<boolean> {
  return inft.isAuthorized(tokenId, signer);
}
