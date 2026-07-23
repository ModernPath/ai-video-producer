"use client";
// REQ-GEN-017 — subscribes to the project SSE stream and refreshes server components
// on change events, so worker results appear without manual reload.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LiveRefresh({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/events`);
    es.addEventListener("hello", () => setLive(true));
    es.addEventListener("changed", () => router.refresh());
    es.onerror = () => setLive(false);
    return () => es.close();
  }, [projectId, router]);

  return (
    <span className="mono" title={live ? "Live updates connected" : "Live updates reconnecting…"}
      style={{ fontSize: 10, color: live ? "var(--ok)" : "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {live ? "live" : "…"}
    </span>
  );
}
