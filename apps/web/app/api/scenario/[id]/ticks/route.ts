import { NextResponse } from "next/server";
import { loadScenario } from "@crucible/core";
import path from "node:path";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const dir = path.resolve(process.cwd(), "..", "..", "scenarios", params.id);
    const scenario = await loadScenario(dir);
    return NextResponse.json({ ticks: scenario.ticks });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
