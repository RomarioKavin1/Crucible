import { downloadBytes } from "@crucible/og-client";
import { ACTIVE_NETWORK } from "@/lib/chain";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { hash: string } }) {
  try {
    const data = await downloadBytes(params.hash, ACTIVE_NETWORK);
    return new Response(Buffer.from(data), {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`download failed: ${msg}`, { status: 502 });
  }
}
