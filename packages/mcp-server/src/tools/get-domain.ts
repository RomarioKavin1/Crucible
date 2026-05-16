// packages/mcp-server/src/tools/get-domain.ts
//
// Returns the EIP-712 domain the server uses to verify signatures.
// Clients MUST call this first and sign with the returned values — otherwise
// their signatures won't recover to the right address (BAD_SIGNATURE).
//
// Stateless, no auth. Cheap to call.
import type { EIP712Domain } from "../auth";

export interface GetDomainResult {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export function handleGetDomain(domain: EIP712Domain): GetDomainResult {
  return {
    name: domain.name,
    version: domain.version,
    chainId: domain.chainId,
    verifyingContract: domain.verifyingContract,
  };
}
