import { NextResponse } from "next/server";
import path from "node:path";
import { publishRun } from "@crucible/og-client";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { agentId, network, recipeHash } = await req.json() as { agentId: string; network: "galileo" | "mainnet"; recipeHash?: string };
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return NextResponse.json({ error: "DEPLOYER_PRIVATE_KEY env required" }, { status: 500 });
  const runDir = path.resolve("./runs", params.id);
  const result = await publishRun({
    runDir,
    agentId: BigInt(agentId),
    recipeHash: recipeHash ?? "0x" + "0".repeat(64),
    network,
    privateKey: pk,
  });
  return NextResponse.json({
    runId: result.runId.toString(),
    txHash: result.txHash,
    traceHash: result.traceHash,
  });
}
