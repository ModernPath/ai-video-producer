import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { config } from "@avd/shared/config";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { listCandidates, listShots } from "@avd/stb";
import {
  createShotAction, generateFrameAction, generateTakeAction, selectFrameAction, selectTakeAction,
} from "../../actions";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 14 };
const btn: React.CSSProperties = { background: "var(--panel-2, #1e232d)", border: "1px solid var(--line)", borderRadius: 7, padding: "6px 12px", color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--accent)", border: "1px solid var(--accent)", color: "#12151b" };
const input: React.CSSProperties = { background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 9px", color: "var(--ink)", fontSize: 12 };

function Tile({ label, selected, video }: { label: string; selected: boolean; video?: boolean }) {
  return (
    <div
      style={{
        width: 128, aspectRatio: "16/9", borderRadius: 7, position: "relative",
        border: selected ? "2px solid var(--accent)" : "1px solid var(--line)",
        background: video
          ? "linear-gradient(115deg,#0b2740 0%,#0e7f8f 45%,#e94fa1 100%)"
          : "linear-gradient(160deg,#2b3a67 0%,#7a4b8f 45%,#e0763a 100%)",
      }}
    >
      <span className="mono" style={{ position: "absolute", left: 5, bottom: 5, fontSize: 9, background: "rgba(10,12,16,.8)", borderRadius: 4, padding: "1px 5px" }}>
        {label}
      </span>
      {selected && (
        <span style={{ position: "absolute", right: 5, top: 5, width: 15, height: 15, borderRadius: "50%", background: "var(--accent)", color: "#12151b", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center" }}>
          ✓
        </span>
      )}
    </div>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = db();
  const [p] = await d.select().from(project).where(eq(project.id, id));
  if (!p) notFound();

  const shots = await listShots(d, id);
  const candidatesByShot = new Map(
    await Promise.all(shots.map(async (s) => [s.id, await listCandidates(d, s.id)] as const))
  );
  const [{ cost }] = await d
    .select({ cost: sql<string>`coalesce(sum(${generation.costUsd}), 0)` })
    .from(generation)
    .where(eq(generation.projectId, id));
  const recentGens = await d
    .select()
    .from(generation)
    .where(eq(generation.projectId, id))
    .orderBy(desc(generation.createdAt))
    .limit(5);

  const generated = shots.filter((s) => s.selectedTakeId).length;

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 24px" }}>
      <p className="mono muted" style={{ fontSize: 12 }}>
        <Link href="/">← projects</Link>
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
        <h1 className="disp" style={{ fontSize: 24 }}>{p.title}</h1>
        <span className="mono muted" style={{ fontSize: 12 }}>{p.aspectRatio} · target {p.targetDurationS}s</span>
        <span className="mono muted" style={{ fontSize: 12 }}>{generated}/{shots.length} generated</span>
        <span className="mono" style={{ fontSize: 12, marginLeft: "auto" }}>
          spend <b>${Number(cost).toFixed(2)}</b>
        </span>
      </div>

      <section style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {shots.map((s) => {
          const dd = s.direction as { synopsis?: string };
          const cands = candidatesByShot.get(s.id)!;
          return (
            <div key={s.id} style={card}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <span className="mono muted" style={{ fontSize: 11 }}>{s.position}</span>
                <b>{s.title}</b>
                <span className="mono muted" style={{ fontSize: 11 }}>{s.durationS}s</span>
                <span className="mono" style={{ fontSize: 11, color: s.selectedTakeId ? "var(--ok)" : cands.frames.length ? "var(--accent)" : "var(--ink-2)" }}>
                  {s.selectedTakeId ? "generated" : cands.frames.length ? "framed" : "planned"}
                </span>
              </div>
              {dd.synopsis && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{dd.synopsis}</p>}

              <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
                <div>
                  <p className="mono muted" style={{ fontSize: 10, marginBottom: 6 }}>START FRAMES</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cands.frames.map((f) => (
                      <form key={f.id} action={selectFrameAction}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="shotId" value={s.id} />
                        <input type="hidden" name="frameCandidateId" value={f.id} />
                        <button type="submit" style={{ all: "unset", cursor: "pointer" }} title="Select frame">
                          <Tile label={`frame ${f.id.slice(-4)}`} selected={s.selectedStartFrameId === f.id} />
                        </button>
                      </form>
                    ))}
                    <form action={generateFrameAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="shotId" value={s.id} />
                      <button type="submit" style={btn}>＋ Frame</button>
                    </form>
                  </div>
                </div>

                <div>
                  <p className="mono muted" style={{ fontSize: 10, marginBottom: 6 }}>TAKES</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cands.takes.map((t) => (
                      <form key={t.id} action={selectTakeAction}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="shotId" value={s.id} />
                        <input type="hidden" name="takeId" value={t.id} />
                        <button type="submit" style={{ all: "unset", cursor: "pointer" }} title="Select take">
                          <Tile video label={`take ${t.id.slice(-4)} · ${t.durationActualS ?? s.durationS}s`} selected={s.selectedTakeId === t.id} />
                        </button>
                      </form>
                    ))}
                    <form action={generateTakeAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="shotId" value={s.id} />
                      <button type="submit" style={btnPrimary}>
                        ▸ Take <span className="mono" style={{ fontWeight: 400 }}>≈ ${(Number(s.durationS) * 0.0).toFixed(2)}·mock</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section style={{ ...card, marginTop: 18 }}>
        <p className="mono muted" style={{ fontSize: 10, marginBottom: 8 }}>ADD SHOT</p>
        <form action={createShotAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="hidden" name="projectId" value={id} />
          <input name="title" placeholder="Shot title" required style={{ ...input, flex: "1 1 160px" }} />
          <input name="synopsis" placeholder="What happens (synopsis)" style={{ ...input, flex: "2 1 240px" }} />
          <input name="subject" placeholder="Subject" style={{ ...input, flex: "1 1 120px" }} />
          <input name="action" placeholder="Action" style={{ ...input, flex: "1 1 120px" }} />
          <input name="durationS" type="number" step="0.5" min={config.shot.minSeconds} max={config.shot.maxSeconds} defaultValue={config.shot.defaultSeconds} style={{ ...input, width: 80 }} />
          <button type="submit" style={btn}>Add shot</button>
        </form>
      </section>

      {recentGens.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <p className="mono muted" style={{ fontSize: 10, marginBottom: 6 }}>RECENT GENERATIONS</p>
          {recentGens.map((g) => (
            <p key={g.id} className="mono muted" style={{ fontSize: 11 }}>
              {g.kind} · {g.modelId} · {g.status} · ${g.costUsd ?? "—"}
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
