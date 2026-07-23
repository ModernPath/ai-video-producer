// REQ-ASM-007 / INV-ASM-005 — public share page: the token grants access ONLY to the
// linked export's output; revoked/expired/unknown tokens see nothing.
import { eq } from "drizzle-orm";
import { resolveShareToken } from "@avd/asm";
import { project } from "@avd/prj/schema";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveShareToken(db(), token);

  if (!resolved) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0c10", color: "#e6e9ef", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ fontSize: 15, opacity: 0.8 }}>This link is no longer available</p>
      </main>
    );
  }

  const [p] = await db().select().from(project).where(eq(project.id, resolved.exportJob.projectId));

  return (
    <main style={{ minHeight: "100vh", background: "#0a0c10", color: "#e6e9ef", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 960, display: "grid", gap: 14 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{p?.title ?? "Shared video"}</h1>
        <video
          controls
          playsInline
          src={`/api/assets/${resolved.outputAssetId}`}
          style={{ width: "100%", borderRadius: 10, background: "#000", border: "1px solid #1e232d" }}
        />
      </div>
    </main>
  );
}
