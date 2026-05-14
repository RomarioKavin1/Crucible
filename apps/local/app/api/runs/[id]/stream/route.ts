import { subscribeActiveRun, getActiveRun } from "@/lib/server/run-store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const initial = getActiveRun(params.id);
      if (initial) send({ tickCount: initial.entries.length, state: initial.state });
      const unsub = subscribeActiveRun(params.id, (snap) => {
        send({
          tickCount: snap.entries.length,
          state: snap.state,
          error: snap.error,
          latest: snap.entries[snap.entries.length - 1],
        });
        if (snap.state === "complete" || snap.state === "error") {
          controller.close();
          unsub();
        }
      });
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
