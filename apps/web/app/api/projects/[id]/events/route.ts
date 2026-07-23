// REQ-GEN-017 / ADR-006 — project SSE stream. MVP bridge: polls the activity
// fingerprint and emits `changed` events; outbox push replaces the poll later.
import { projectActivityFingerprint } from "@avd/prj/activity";
import { db } from "../../../../../lib/db";

export const dynamic = "force-dynamic";

const POLL_MS = 1500;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let last = await projectActivityFingerprint(db(), id);
      controller.enqueue(encoder.encode(`event: hello\ndata: connected\n\n`));

      const timer = setInterval(async () => {
        try {
          const now = await projectActivityFingerprint(db(), id);
          if (now !== last) {
            last = now;
            controller.enqueue(encoder.encode(`event: changed\ndata: ${Date.now()}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`: keepalive\n\n`));
          }
        } catch {
          // transient DB error — keep the stream alive
        }
      }, POLL_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
