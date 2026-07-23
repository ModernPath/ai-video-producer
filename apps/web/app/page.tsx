import Link from "next/link";
import { desc } from "drizzle-orm";
import { project } from "@avd/prj/schema";
import { createProjectAction } from "./actions";
import { db } from "../lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await db().select().from(project).orderBy(desc(project.createdAt)).limit(50);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 24px" }}>
      <p className="mono muted" style={{ fontSize: 12 }}>local studio</p>
      <h1 className="disp" style={{ fontSize: 30, marginTop: 6 }}>
        Projects
        <span aria-hidden style={{ display: "inline-block", width: "0.4em", height: "0.4em", borderRadius: "50%", background: "var(--accent)", marginLeft: "0.3em" }} />
      </h1>

      <form action={createProjectAction} style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
        <input
          name="title"
          placeholder="New video title…"
          required
          style={{ flex: "1 1 240px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", color: "var(--ink)", fontSize: 14 }}
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
          <Link key={p.id} href={`/p/${p.id}`} style={{ border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 16 }}>
            <p style={{ fontWeight: 600 }}>{p.title}</p>
            <p className="mono muted" style={{ fontSize: 11, marginTop: 6 }}>
              {p.aspectRatio} · target {p.targetDurationS}s · {p.status}
            </p>
          </Link>
        ))}
        {projects.length === 0 && <p className="muted">No projects yet — create the first one above.</p>}
      </div>
    </main>
  );
}
