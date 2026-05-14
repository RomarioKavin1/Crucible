import { NextResponse } from "next/server";
import { getScenarioDetail } from "@/lib/scenarios";

export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const detail = await getScenarioDetail(params.id);
  if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(detail);
}
