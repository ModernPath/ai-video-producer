// REQ-PLT-004 — the endpoint the Kamal proxy probes before it moves traffic to a new container.
//
// It answers from the app process only, on purpose. A health check that also pings Postgres turns a
// brief database blip into a failed DEPLOY and a rollback of a container that was fine; the DB is
// watched separately. What this asserts is the one thing the proxy needs to know: this container
// booted and is serving.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "ai-video-producer" });
}
