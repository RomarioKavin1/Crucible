import { downloadBytes } from "@crucible/og-client";
import { ACTIVE_NETWORK } from "@/lib/chain";

export async function GET(_req: Request, { params }: { params: { hash: string } }) {
  try {
    const data = await downloadBytes(params.hash, ACTIVE_NETWORK);
    return new Response(Buffer.from(data), {
      headers: {
        "Content-Type": "application/x-yaml",
        "Content-Disposition": `attachment; filename="recipe-${params.hash.slice(0, 8)}.yaml"`,
      },
    });
  } catch (e) {
    return new Response(`recipe download failed: ${e instanceof Error ? e.message : e}`, { status: 502 });
  }
}
