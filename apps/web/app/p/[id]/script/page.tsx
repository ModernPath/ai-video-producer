import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { project } from "@avd/prj/schema";
import { scriptVersion, shotPlanProposal } from "@avd/stb/schema";
import { getMusicBrief } from "@avd/stb";
import { archetypes, priceTable } from "@avd/shared/config";
import { applyPlanAction, draftScriptAction, generateMusicTrackAction, musicBriefAction, proposePlanAction, setArchetypeAction, transcribeTrackAction, updateBriefAction, uploadTrackAction } from "../../../actions";
import { LiveRefresh } from "../../../../components/LiveRefresh";
import { db } from "../../../../lib/db";
import { Markdown } from "../../../../components/Markdown";
import { normalizePlannedShots } from "@avd/stb/plan-normalize";
import { generation } from "@avd/gen/schema";
import { and, inArray } from "drizzle-orm";

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
  const failedGens = await d
    .select()
    .from(generation)
    .where(and(eq(generation.projectId, id), eq(generation.status, "failed"), inArray(generation.kind, ["script", "shot_plan", "music_brief", "music", "transcript"])))
    .orderBy(desc(generation.createdAt))
    .limit(1);
  const lastFailure = failedGens[0];
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

      {lastFailure && (
        <section style={{ ...card, marginTop: 16, borderColor: "#7a4b3a" }}>
          <p className="mono" style={{ fontSize: 11, color: "#e0763a" }}>
            {lastFailure.kind} failed · {lastFailure.errorCode}: {lastFailure.errorDetail?.slice(0, 220)}
          </p>
          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            {lastFailure.kind === "music"
              ? "The music model blocked this brief (usually intense vocabulary) — hit Regenerate on the brief, then Generate track again. Failed generations are never charged."
              : "Adjust the prompt or try again — failed generations are never charged."}
          </p>
        </section>
      )}

      <section style={{ ...card, marginTop: 20 }}>
        <form action={updateBriefAction} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="hidden" name="projectId" value={id} />
          <div style={{ flex: 1 }}>
            <p className="mono muted" style={{ fontSize: 10, marginBottom: 6 }}>VIDEO PROMPT — feeds script, shots &amp; music (with your cast)</p>
            <textarea
              name="idea"
              rows={2}
              defaultValue={String((p.brief as Record<string, unknown>)?.idea ?? "")}
              placeholder="e.g. a sunrise launch film for our energy drink — bold, kinetic, city waking up"
              style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 10px", color: "var(--ink)", fontSize: 12.5, resize: "vertical" }}
            />
          </div>
          <button type="submit" style={{ ...btn, marginTop: 20 }}>Save prompt</button>
        </form>
        <form action={setArchetypeAction} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <select name="archetype" defaultValue={p.archetype ?? ""} className="mono" title="Directing archetype (docs/87) — injects the recipe into script, shot plan and music prompts" style={{ background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", color: "var(--ink)", fontSize: 11 }}>
            <option value="">directing: freeform</option>
            {Object.entries(archetypes).map(([k, a]) => <option key={k} value={k}>directing: {a.name}</option>)}
          </select>
          <button type="submit" style={btn}>Set</button>
        </form>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        {latest ? (
          <>
            <p className="mono muted" style={{ fontSize: 11, marginBottom: 10 }}>
              v{latest.version} · {latest.source} · {versions.length} version{versions.length > 1 ? "s" : ""}
            </p>
            <Markdown>{latest.content}</Markdown>
          </>
        ) : (
          <p className="muted">No script yet — draft one from the project brief.</p>
        )}
      </section>

      {proposals.map((prop) => {
        const shots = normalizePlannedShots(prop.changes); // old rows may hold raw model shapes
        return (
          <section key={prop.id} style={{ ...card, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p className="mono muted" style={{ fontSize: 10 }}>SHOT PLAN · {prop.status}</p>
              {prop.status === "proposed" && (
                <form action={applyPlanAction} style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="proposalId" value={prop.id} />
                  <button type="submit" style={btn} title="Replaces current shots that have no takes; shots with takes are kept (INV-STB-007)">Apply {shots.length} shots</button>
                  {/* REQ-STB-017: apply + generate first frames from the authored image scripts in one gesture */}
                  <button type="submit" name="generateFrames" value="1" style={btnPrimary} title="Replaces current shots that have no takes; shots with takes are kept (INV-STB-007)">Apply + first frames</button>
                  <span className="mono muted" style={{ fontSize: 9 }}>replaces unpaid shots · shots with takes are kept</span>
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
          <form action={generateMusicTrackAction} style={{ display: "inline" }}>
            <input type="hidden" name="projectId" value={id} />
            {music?.prompt && (
              <button type="submit" style={btnPrimary} title="Runs the brief (incl. lyrics) through lyria-3-pro — full song, attaches as the project track">
                ♫ Generate track ≈ ${priceTable.musicPerTrackUsd.toFixed(2)}
              </button>
            )}
          </form>
        </div>
        {music ? (
          <>
            <div style={{ marginTop: 10, background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
              <Markdown>{music.prompt}</Markdown>
            </div>
            {music.transcript && (
              <details style={{ marginTop: 10 }} open>
                <summary className="mono muted" style={{ fontSize: 10, cursor: "pointer" }}>TRACK TRANSCRIPT · MM:SS (drives lyric-synced timing)</summary>
                <pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.7, background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginTop: 6 }}>{music.transcript}</pre>
              </details>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              {music.activeTrackAssetId ? (
                <>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ok)" }}>track attached ✓</span>
                  <audio controls src={`/api/assets/${music.activeTrackAssetId}`} style={{ height: 30 }} />
                  <form action={transcribeTrackAction} style={{ display: "inline" }}>
                    <input type="hidden" name="projectId" value={id} />
                    <button type="submit" style={btn} title="MM:SS-timestamped lyrics/sections via audio understanding — for lyric-synced cuts">⏱ Transcribe</button>
                  </form>
                </>
              ) : (
                <span className="muted" style={{ fontSize: 11 }}>Copy the prompt into Suno, generate, then attach the audio:</span>
              )}
              <form action={uploadTrackAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="hidden" name="projectId" value={id} />
                <input type="file" name="track" accept="audio/mpeg,audio/wav" className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }} />
                <button type="submit" style={btn}>{music.activeTrackAssetId ? "Replace track" : "Attach track"}</button>
              </form>
            </div>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>No brief yet — generate one from the project and script.</p>
        )}
      </section>
    </main>
  );
}
