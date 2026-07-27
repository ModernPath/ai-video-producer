"use client";
// REQ-GEN-017 — subscribes to the project SSE stream and refreshes server components
// on change events, so worker results appear without manual reload.
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createCoalescer } from "../lib/coalesce";

/** REQ-GEN-029: quiet period before refreshing — long enough for a server action to commit. */
const REFRESH_COALESCE_MS = 350;

export function LiveRefresh({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // REQ-GEN-029: refreshing on EVERY change event tore the tree down while React was still
    // committing a just-submitted form action — a server action's own revalidate emits one of
    // these. Coalesce, and refresh in a transition so it can never pre-empt that commit.
    const refresh = createCoalescer(() => startTransition(() => router.refresh()), REFRESH_COALESCE_MS);
    const es = new EventSource(`/api/projects/${projectId}/events`);
    es.addEventListener("hello", () => setLive(true));
    es.addEventListener("changed", () => refresh());
    es.onerror = () => setLive(false);
    return () => { refresh.cancel(); es.close(); };
  }, [projectId, router]);

  return (
    <span className="mono" title={live ? "Live updates connected" : "Live updates reconnecting…"}
      style={{ fontSize: 10, color: live ? "var(--ok)" : "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {live ? "live" : "…"}
    </span>
  );
}
