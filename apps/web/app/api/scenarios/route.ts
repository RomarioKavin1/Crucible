import { NextResponse } from "next/server";
import { listScenarios } from "@/lib/scenarios";

export const revalidate = 300;

export async function GET() {
  const scenarios = await listScenarios();
  return NextResponse.json({ scenarios });
}
