import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { project } from "@avd/prj/schema";
import { scriptVersion, shotPlanProposal } from "@avd/stb/schema";
import { getMusicBrief } from "@avd/stb";
import { applyPlanAction, draftScriptAction, musicBriefAction, proposePlanAction } from "../../../actions";
import { LiveRefresh } from "../../../../components/LiveRefresh";
import { db } from "../../../../lib/db";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 16 };
const btn: React.CSSProperties = { background: "#1e232d", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 14px", color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--accent)", border: "1px solid var(--accent)", color: "#12151b" };

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = db();
  const [p] = await d.select().from(project).where(eq(project.id, id));
  if (!p) notFound();

  const versions = await d.select().from(scriptVersion).where(eq(scriptVersion.projectId, id)).orderBy(desc(scriptVersion.version));
  const latest = versions[0];
  const music = await getMusicBrief(d, id);
  const proposals = await d
    .select()
    .from(shotPlanProposal)
    .where(eq(shotPlanProposal.projectId, id))
    .orderBy(desc(shotPlanProposal.createdAt))
    .limit(3);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "36px 24px" }}>
      <p className="mono muted" style={{ fontSize: 12 }}>
        <Link href={`/p/${id}`}>← storyboard</Link> <LiveRefresh projectId={id} />
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
        <h1 className="disp" style={{ fontSize: 22 }}>Script — {p.title}</h1>
        <span className="mono muted" style={{ fontSize: 12 }}>target {p.targetDurationS}s</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <form action={draftScriptAction}>
            <input type="hidden" name="projectId" value={id} />
            <button type="submit" style={latest ? btn : btnPrimary}>{latest ? "Redraft" : "Draft script"}</button>
          </form>
          <form action={proposePlanAction}>
            <input type="hidden" name="projectId" value={id} />
            <button type="submit" disabled={!latest} style={{ ...btnPrimary, opacity: latest ? 1 : 0.45 }}>
              Break into shots
            </button>
          </form>
        </div>
      </div>

      <section style={{ ...card, marginTop: 20 }}>
        {latest ? (
          <>
            <p className="mono muted" style={{ fontSize: 11, marginBottom: 10 }}>
              v{latest.version} · {latest.source} · {versions.length} version{versions.length > 1 ? "s" : ""}
            </p>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.7, maxWidth: "62ch" }}>
              {latest.content}
            </pre>
          </>
        ) : (
          <p className="muted">No script yet — draft one from the project brief.</p>
        )}
      </section>

      {proposals.map((prop) => {
        const shots = prop.changes as Array<{ title: string; durationS: number; direction: { synopsis: string } }>;
        return (
          <section key={prop.id} style={{ ...card, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p className="mono muted" style={{ fontSize: 10 }}>SHOT PLAN · {prop.status}</p>
              {prop.status === "proposed" && (
                <form action={applyPlanAction} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="proposalId" value={prop.id} />
                  <button type="submit" style={btnPrimary}>Apply {shots.length} shots</button>
                </form>
              )}
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {shots.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
                  <span className="mono muted">{i + 1}</span>
                  <b>{s.title}</b>
                  <span className="muted">{s.direction.synopsis}</span>
                  <span className="mono muted" style={{ marginLeft: "auto" }}>{s.durationS}s</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p className="mono muted" style={{ fontSize: 10 }}>MUSIC BRIEF · Suno round-trip (docs/17)</p>
          <form action={musicBriefAction} style={{ marginLeft: "auto" }}>
            <input type="hidden" name="projectId" value={id} />
            <button type="submit" style={music ? btn : btnPrimary}>{music ? "Regenerate" : "Generate music brief"}</button>
          </form>
        </div>
        {music ? (
          <>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7, marginTop: 10, background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
              {music.prompt}
            </pre>
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              Copy this prompt into Suno, generate the track, then attach the audio here (upload lands with the library slice).
            </p>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>No brief yet — generate one from the project and script.</p>
        )}
      </section>
    </main>
  );
}
