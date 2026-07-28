import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { asset } from "@avd/ast/schema";
import { v7 as uuidv7 } from "uuid";
import { project } from "@avd/prj/schema";
import { archiveProjectAction, createProjectAction, unarchiveProjectAction } from "./actions";
import { SubmitButton } from "../components/SubmitButton";
import { UserChip } from "../components/UserChip";
import { db } from "../lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await db()
    .select()
    .from(project)
    .where(eq(project.status, "active"))
    .orderBy(desc(project.createdAt))
    .limit(50);
  // poster per project: newest ready image (thumb served via ?thumb=1)
  const posterRows = projects.length
    ? await db()
        .select({ id: asset.id, projectId: asset.projectId, createdAt: asset.createdAt })
        .from(asset)
        .where(and(inArray(asset.projectId, projects.map((p) => p.id)), eq(asset.kind, "image"), eq(asset.status, "ready"), isNull(asset.deletedAt)))
        .orderBy(desc(asset.createdAt))
    : [];
  const posters = new Map<string, string>();
  for (const r of posterRows) if (r.projectId && !posters.has(r.projectId)) posters.set(r.projectId, r.id);

  const archived = await db()
    .select()
    .from(project)
    .where(eq(project.status, "archived"))
    .orderBy(desc(project.createdAt))
    .limit(50);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 24px" }}>
      <p className="mono muted" style={{ fontSize: 12, display: "flex", gap: 16, alignItems: "center" }}>
        local studio <Link href="/library" style={{ color: "var(--accent)" }}>library — cast &amp; brand →</Link>
        <span style={{ marginLeft: "auto" }}><UserChip /></span>
      </p>
      <h1 className="disp" style={{ fontSize: 30, marginTop: 6 }}>
        Projects
        <span aria-hidden style={{ display: "inline-block", width: "0.4em", height: "0.4em", borderRadius: "50%", background: "var(--accent)", marginLeft: "0.3em" }} />
      </h1>

      <form action={createProjectAction} style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
        <input type="hidden" name="commandId" value={uuidv7()} />
        <input
          name="title"
          placeholder="New video title…"
          required
          style={{ flex: "1 1 240px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", color: "var(--ink)", fontSize: 14 }}
        />
        <input
          name="idea"
          placeholder="What's the video about? (optional prompt)"
          style={{ flex: "2 1 280px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", color: "var(--ink)", fontSize: 14 }}
        />
        <select name="aspectRatio" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", color: "var(--ink)" }}>
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
        </select>
        <button type="submit" style={{ background: "var(--accent)", color: "#12151b", fontWeight: 600, border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
          Create project
        </button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginTop: 28 }}>
        {projects.map((p) => (
          <div key={p.id} style={{ border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
            <Link href={`/p/${p.id}`}>
              {posters.has(p.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/assets/${posters.get(p.id)}?thumb=1`} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", borderBottom: "1px solid var(--line)" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--stage)", display: "grid", placeItems: "center", borderBottom: "1px solid var(--line)" }}>
                  <span className="mono muted" style={{ fontSize: 10 }}>no frames yet</span>
                </div>
              )}
              <div style={{ padding: "12px 16px 14px" }}>
                <p style={{ fontWeight: 600 }}>{p.title}</p>
                <p className="mono muted" style={{ fontSize: 11, marginTop: 6 }}>
                  {p.aspectRatio} · target {p.targetDurationS}s · {p.status}
                </p>
              </div>
            </Link>
            <form action={archiveProjectAction} style={{ position: "absolute", right: 10, top: 10 }}>
              <input type="hidden" name="projectId" value={p.id} />
              <SubmitButton small title="Archive — hides the project and blocks generation/export until unarchived" pendingLabel="…">⌫ archive</SubmitButton>
            </form>
          </div>
        ))}
        {projects.length === 0 && <p className="muted">No projects yet — create the first one above.</p>}
      </div>

      {archived.length > 0 && (
        <details style={{ marginTop: 26 }}>
          <summary className="mono muted" style={{ fontSize: 11, cursor: "pointer" }}>ARCHIVED · {archived.length}</summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginTop: 12 }}>
            {archived.map((p) => (
              <div key={p.id} style={{ border: "1px dashed var(--line)", borderRadius: 10, padding: 16, opacity: 0.7 }}>
                <p style={{ fontWeight: 600 }}>{p.title}</p>
                <form action={unarchiveProjectAction} style={{ marginTop: 8 }}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <SubmitButton small pendingLabel="…">↩ unarchive</SubmitButton>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
