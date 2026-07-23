import { ZoomImage } from "../../../components/ZoomImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { config, priceTable, providerLimits } from "@avd/shared/config";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { exportJob } from "@avd/asm/schema";
import { getMusicBrief, listCandidates, listShots } from "@avd/stb";
import { assembleFramePrompt, assembleTakePrompt } from "@avd/gen";
import { listEntities, listProjectEntities } from "@avd/ast";
import { costMeterUsd } from "@avd/prj/service";
import { shareLink } from "@avd/asm/schema";
import {
  createShotAction, exportAction, generateFrameAction, generateMissingFramesAction, generateTakeAction,
  createShareLinkAction, removeCandidateAction, updateShotRefsAction, removeShotAction, retryExportAction, retryGenerationAction, saveScriptsAndGenerateAction, selectFrameAction, selectTakeAction, setAudioModeAction, setCastAction, updateShotScriptsAction,
} from "../../actions";
import { AnimaticPlayer } from "../../../components/AnimaticPlayer";
import { LiveRefresh } from "../../../components/LiveRefresh";
import { SubmitButton } from "../../../components/SubmitButton";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 14 };
const btn: React.CSSProperties = { background: "var(--panel-2, #1e232d)", border: "1px solid var(--line)", borderRadius: 7, padding: "6px 12px", color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--accent)", border: "1px solid var(--accent)", color: "#12151b" };
const input: React.CSSProperties = { background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 9px", color: "var(--ink)", fontSize: 12 };

function Tile({ label, selected, assetId, video }: { label: string; selected: boolean; assetId: string; video?: boolean }) {
  return (
    <div
      style={{
        width: video ? 192 : 128, aspectRatio: "16/9", borderRadius: 7, position: "relative",
        overflow: "hidden", background: "#0a0c10",
        border: selected ? "2px solid var(--accent)" : "1px solid var(--line)",
      }}
    >
      {video ? (
        <video src={`/api/assets/${assetId}`} muted playsInline preload="metadata" controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <ZoomImage src={`/api/assets/${assetId}`} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <span className="mono" style={{ position: "absolute", left: 5, top: 5, fontSize: 9, background: "rgba(10,12,16,.8)", borderRadius: 4, padding: "1px 5px" }}>
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
  const cost = await costMeterUsd(d, id); // INV-PRJ-004: succeeded+running only — failed/canceled don't count as spend
  const { dailySpendUsd } = await import("@avd/gen");
  const spentToday = await dailySpendUsd(d, p.organizationId);
  const recentGens = await d
    .select()
    .from(generation)
    .where(eq(generation.projectId, id))
    .orderBy(desc(generation.createdAt))
    .limit(5);
  const activeGens = await d
    .select()
    .from(generation)
    .where(and(eq(generation.projectId, id), inArray(generation.status, ["queued", "running"])));
  const activeByShot = new Map<string, { frame: number; take: number }>();
  for (const g of activeGens) {
    const shotId = (g.target as { shotId?: string }).shotId;
    if (!shotId) continue;
    const e = activeByShot.get(shotId) ?? { frame: 0, take: 0 };
    if (g.kind === "frame" || g.kind === "image_edit") e.frame++;
    if (g.kind === "take" || g.kind === "retake") e.take++;
    activeByShot.set(shotId, e);
  }

  const allTakes = [...candidatesByShot.values()].flatMap((c) => c.takes);
  const takeGens = allTakes.length
    ? await d.select().from(generation).where(inArray(generation.id, allTakes.map((t) => t.generationId)))
    : [];
  const takeCondFrame = new Map(
    takeGens.map((g) => [g.id, ((g.promptSnapshot as { refs?: { startFrameAssetId?: string } }).refs?.startFrameAssetId) ?? null])
  );
  const generated = shots.filter((s) => s.selectedTakeId).length;
  const music = await getMusicBrief(d, id);
  const orgEntities = await listEntities(d, p.organizationId);
  const cast = await listProjectEntities(d, id);
  const castIds = new Set(cast.map((e) => e.id));
  const exports_ = await d
    .select()
    .from(exportJob)
    .where(eq(exportJob.projectId, id))
    .orderBy(desc(exportJob.createdAt))
    .limit(5);
  const { storyboardSnapshot } = await import("@avd/asm/schema");
  const shareRows = exports_.length
    ? await d.select().from(shareLink).where(inArray(shareLink.exportJobId, exports_.map((e) => e.id)))
    : [];
  const shareByJob = new Map(shareRows.filter((r) => !r.revokedAt).map((r) => [r.exportJobId, r]));
  const snaps = exports_.length
    ? await d.select().from(storyboardSnapshot).where(inArray(storyboardSnapshot.id, exports_.map((e) => e.snapshotId)))
    : [];
  const exportSnapshots = new Map(snaps.map((s) => [s.id, (s.excluded ?? []) as Array<{ shotId: string; title: string }>]));

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 24px" }}>
      <p className="mono muted" style={{ fontSize: 12, display: "flex", gap: 16 }}>
        <Link href="/">← projects</Link>
        <Link href={`/p/${id}/script`} style={{ color: "var(--accent)" }}>script studio →</Link>
        <LiveRefresh projectId={id} />
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
        <h1 className="disp" style={{ fontSize: 24 }}>{p.title}</h1>
        <span className="mono muted" style={{ fontSize: 12 }}>{p.aspectRatio} · target {p.targetDurationS}s</span>
        <span className="mono muted" style={{ fontSize: 12 }}>{generated}/{shots.length} generated</span>
        <span className="mono" style={{ fontSize: 12, marginLeft: "auto" }} title="Left: this project's total spend. Right: today's org-wide spend vs the daily cap (INV-GEN-004).">
          spend <b>${Number(cost).toFixed(2)}</b>
          <span className="muted"> · today ${spentToday.toFixed(2)} / ${config.gen.quota.dailyUsdPerOrg.toFixed(2)}</span>
        </span>
        <AnimaticPlayer
          shots={shots.map((s) => {
            const cands = candidatesByShot.get(s.id)!;
            const frame = cands.frames.find((f) => f.id === s.selectedStartFrameId) ?? cands.frames[0];
            return { id: s.id, durationS: Number(s.durationS), frameAssetId: frame?.imageAssetId ?? null, title: s.title };
          })}
          musicAssetId={music?.activeTrackAssetId}
        />
        <form action={generateMissingFramesAction}>
          <input type="hidden" name="projectId" value={id} />
          <SubmitButton pendingLabel="Generating frames…">＋ Missing frames</SubmitButton>
        </form>
        <form action={setAudioModeAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="hidden" name="projectId" value={id} />
          <select name="mode" defaultValue={p.audioMixMode} className="mono" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", color: "var(--ink)", fontSize: 11 }}>
            <option value="native">audio: native</option>
            <option value="music">audio: music</option>
            <option value="mix">audio: mix</option>
          </select>
          <SubmitButton small pendingLabel="…">Set</SubmitButton>
        </form>
        {generated === shots.length ? (
          <form action={exportAction}>
            <input type="hidden" name="projectId" value={id} />
            <SubmitButton primary disabled={shots.length === 0} pendingLabel="Exporting…">
              Export cut
            </SubmitButton>
          </form>
        ) : (
          <form action={exportAction} title="Takeless shots are skipped explicitly (INV-ASM-002)">
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="excludeShotIds" value={shots.filter((s) => !s.selectedTakeId).map((s) => s.id).join(",")} />
            <SubmitButton primary disabled={generated === 0} pendingLabel="Exporting…">
              Export {generated} ready · skip {shots.length - generated}
            </SubmitButton>
          </form>
        )}
      </div>

      {orgEntities.length > 0 && (
        <section style={{ ...card, marginTop: 16 }}>
          <form action={setCastAction} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="projectId" value={id} />
            <p className="mono muted" style={{ fontSize: 10 }}>CAST</p>
            {orgEntities.map((e) => (
              <label key={e.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" name="entityIds" value={e.id} defaultChecked={castIds.has(e.id)} />
                <span className="mono muted" style={{ fontSize: 9, textTransform: "uppercase" }}>{e.kind}</span> {e.name}
              </label>
            ))}
            <SubmitButton small pendingLabel="Saving…">Save cast</SubmitButton>
            <Link href="/library" className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>library →</Link>
          </form>
        </section>
      )}

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
                <form action={removeShotAction} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="shotId" value={s.id} />
                  {s.selectedTakeId && <input type="hidden" name="confirmPaid" value="1" />}
                  <SubmitButton className="mono" style={{ fontSize: 10, background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 8px", color: "var(--ink-2)", cursor: "pointer" }}
                    title={s.selectedTakeId ? "Removes this cut AND its paid take" : "Remove this cut"}>
                    {s.selectedTakeId ? "✕ Remove cut (discards take)" : "✕ Remove cut"}
                  </SubmitButton>
                </form>
              </div>
              {dd.synopsis && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{dd.synopsis}</p>}

              {(() => null)()}
              <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
                <div>
                  <p className="mono muted" style={{ fontSize: 10, marginBottom: 6 }}>START FRAME · candidates, pick 1 — only the selected frame is sent to the video model{(activeByShot.get(s.id)?.frame ?? 0) > 0 && <span className="gen-pulse"> ● generating image…</span>}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cands.frames.map((f) => (
                      <div key={f.id} style={{ display: "grid", gap: 4, justifyItems: "start" }}>
                        <form action={selectFrameAction}>
                          <input type="hidden" name="projectId" value={id} />
                          <input type="hidden" name="shotId" value={s.id} />
                          <input type="hidden" name="frameCandidateId" value={f.id} />
                          <button type="submit" style={{ all: "unset", cursor: "pointer" }} title="Select frame">
                            <Tile label={`frame ${f.id.slice(-4)}`} selected={s.selectedStartFrameId === f.id} assetId={f.imageAssetId} />
                          </button>
                        </form>
                        {s.selectedStartFrameId !== f.id && (
                          <form action={removeCandidateAction}>
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="kind" value="frame" />
                            <input type="hidden" name="id" value={f.id} />
                            <button type="submit" className="mono" title="Remove candidate (asset kept)" style={{ background: "none", border: "1px solid var(--line)", borderRadius: 5, color: "var(--ink-2)", fontSize: 9, padding: "1px 6px", cursor: "pointer" }}>✕ remove</button>
                          </form>
                        )}
                      </div>
                    ))}
                    <form action={generateFrameAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="shotId" value={s.id} />
                      <SubmitButton disabled={(activeByShot.get(s.id)?.frame ?? 0) > 0} pendingLabel="Framing…">＋ {config.frame.candidatesDefault} frames ≈ ${(config.frame.candidatesDefault * priceTable.imagePerImageUsd.standard).toFixed(2)}</SubmitButton>
                    </form>
                  </div>
                </div>

                <div>
                  <p className="mono muted" style={{ fontSize: 10, marginBottom: 6 }}>TAKES{(activeByShot.get(s.id)?.take ?? 0) > 0 && <span className="gen-pulse"> ● generating video…</span>}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cands.takes.map((t) => (
                      <div key={t.id} style={{ display: "grid", gap: 5, justifyItems: "start" }}>
                        <Tile video label={`take ${t.id.slice(-4)} · ${t.durationActualS ?? s.durationS}s`} selected={s.selectedTakeId === t.id} assetId={t.videoAssetId} />
                        {(() => {
                          const cond = takeCondFrame.get(t.generationId);
                          const selAsset = cands.frames.find((f) => f.id === s.selectedStartFrameId)?.imageAssetId;
                          return cond && selAsset && cond !== selAsset ? (
                            <span className="mono muted" title="This take was generated from a previously selected start frame (INV-STB-006 — it is preserved, not regenerated)" style={{ fontSize: 9, border: "1px dashed var(--line)", borderRadius: 4, padding: "1px 5px" }}>from older frame</span>
                          ) : null;
                        })()}
                        {s.selectedTakeId !== t.id && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <form action={selectTakeAction}>
                              <input type="hidden" name="projectId" value={id} />
                              <input type="hidden" name="shotId" value={s.id} />
                              <input type="hidden" name="takeId" value={t.id} />
                              <SubmitButton small pendingLabel="Selecting…">Select take</SubmitButton>
                            </form>
                            <form action={removeCandidateAction}>
                              <input type="hidden" name="projectId" value={id} />
                              <input type="hidden" name="kind" value="take" />
                              <input type="hidden" name="id" value={t.id} />
                              <button type="submit" className="mono" title="Remove take (asset kept)" style={{ background: "none", border: "1px solid var(--line)", borderRadius: 5, color: "var(--ink-2)", fontSize: 9, padding: "1px 6px", cursor: "pointer" }}>✕</button>
                            </form>
                          </div>
                        )}
                      </div>
                    ))}
                    <form action={generateTakeAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="shotId" value={s.id} />
                      <SubmitButton primary disabled={(activeByShot.get(s.id)?.take ?? 0) > 0} pendingLabel="Generating take…">
                        ▸ Take ≈ ${(([...providerLimits.video.allowedDurationsS].reduce((b, d) => Math.abs(d - Number(s.durationS)) < Math.abs(b - Number(s.durationS)) || (Math.abs(d - Number(s.durationS)) === Math.abs(b - Number(s.durationS)) && d > b) ? d : b)) * priceTable.videoPerSecondUsd).toFixed(2)}
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>

              {(() => {
                const dirIn = {
                  synopsis: dd.synopsis ?? "", subject: (s.direction as { subject?: string }).subject ?? "",
                  action: (s.direction as { action?: string }).action ?? "",
                  camera: (s.direction as { camera?: string }).camera, mood: (s.direction as { mood?: string }).mood,
                  dialogue: (s.direction as { dialogue?: string }).dialogue, audioNotes: (s.direction as { audioNotes?: string }).audioNotes,
                };
                const entities = cast.map((e) => ({ kind: e.kind, name: e.name, description: e.description }));
                const autoImage = assembleFramePrompt({ aspectRatio: p.aspectRatio, entities, direction: dirIn });
                const autoVideo = assembleTakePrompt({ aspectRatio: p.aspectRatio, durationSeconds: Number(s.durationS), entities, direction: dirIn });
                const selFrame = cands.frames.find((f) => f.id === s.selectedStartFrameId);
                const castRefs = cast.flatMap((e) => e.refAssetIds);
                const effectiveRefs = s.refAssetIds ?? castRefs;
                return (
                  <>
                  <form action={saveScriptsAndGenerateAction} style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="shotId" value={s.id} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                          <p className="mono muted" style={{ fontSize: 10 }}>IMAGE SCRIPT {s.imagePrompt ? "· custom" : "· auto"}</p>
                          {effectiveRefs.map((rid) => (
                            <ZoomImage key={rid} src={`/api/assets/${rid}`} alt="reference image" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
                          ))}
                        </div>
                        <textarea name="imagePrompt" rows={3} defaultValue={s.imagePrompt ?? ""} placeholder={autoImage}
                          style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 11, fontFamily: "var(--mono)", resize: "vertical" }} />
                      </div>
                      <div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                          <p className="mono muted" style={{ fontSize: 10 }}>VIDEO SCRIPT {s.videoPrompt ? "· custom" : "· auto"}</p>
                          {selFrame && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <ZoomImage src={`/api/assets/${selFrame.imageAssetId}`} alt="start frame" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--accent)" }} />
                          )}
                          {effectiveRefs.map((rid) => (
                            <ZoomImage key={rid} src={`/api/assets/${rid}`} alt="reference image" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
                          ))}
                        </div>
                        <textarea name="videoPrompt" rows={3} defaultValue={s.videoPrompt ?? ""} placeholder={autoVideo}
                          style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 11, fontFamily: "var(--mono)", resize: "vertical" }} />
                      </div>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="submit" name="generate" value="none" className="mono" style={{ background: "#1e232d", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", fontSize: 11, padding: "3px 10px", cursor: "pointer" }}>Save</button>
                      <button type="submit" name="generate" value="frame" disabled={(activeByShot.get(s.id)?.frame ?? 0) > 0} style={{ background: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 6, color: "#12151b", fontSize: 11, fontWeight: 600, padding: "3px 10px", cursor: "pointer" }}>Save &amp; generate frame</button>
                      <button type="submit" name="generate" value="take" disabled={(activeByShot.get(s.id)?.take ?? 0) > 0} style={{ background: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 6, color: "#12151b", fontSize: 11, fontWeight: 600, padding: "3px 10px", cursor: "pointer" }}>Save &amp; generate take</button>
                      <span className="mono muted" style={{ fontSize: 9 }}>empty = auto · custom text sent verbatim</span>
                    </div>
                  </form>
                    {cast.length > 0 && (
                      <details style={{ marginTop: 6 }}>
                        <summary className="mono muted" style={{ fontSize: 10, cursor: "pointer" }}>
                          refs for this shot: {s.refAssetIds === null ? "whole cast (default)" : `${effectiveRefs.length} selected`} · edit
                        </summary>
                        <form action={updateShotRefsAction} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 0" }}>
                          <input type="hidden" name="projectId" value={id} />
                          <input type="hidden" name="shotId" value={s.id} />
                          {cast.map((e) => e.refAssetIds.map((rid) => (
                            <label key={rid} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 10 }} className="mono muted">
                              <input type="checkbox" name="refAssetIds" value={rid} defaultChecked={(s.refAssetIds ?? castRefs).includes(rid)} />
                              <ZoomImage src={`/api/assets/${rid}`} alt={`${e.name} ref`} style={{ width: 26, height: 26, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
                              {e.name}
                            </label>
                          )))}
                          <SubmitButton small pendingLabel="Saving…">Save refs</SubmitButton>
                          <SubmitButton small name="reset" value="1" pendingLabel="Resetting…">use whole cast</SubmitButton>
                        </form>
                      </details>
                    )}
                  </>
                );
              })()}
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
          <SubmitButton pendingLabel="Adding…">Add shot</SubmitButton>
        </form>
      </section>

      {exports_.length > 0 && (
        <section style={{ ...card, marginTop: 18 }}>
          <p className="mono muted" style={{ fontSize: 10, marginBottom: 8 }}>EXPORTS</p>
          {exports_.map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "5px 0", fontSize: 12 }}>
              <span className="mono muted">#{e.id.slice(-6)}</span>
              <span className="mono" style={{ color: e.status === "succeeded" ? "var(--ok)" : e.status === "failed" ? "#e0763a" : "var(--accent)" }}>
                {e.status}{e.progressStage && e.status === "running" ? ` · ${e.progressStage}` : ""}
              </span>
              {e.status === "succeeded" && e.outputAssetId && (
                <>
                  <a href={`/api/assets/${e.outputAssetId}`} download="final.mp4" className="mono" style={{ color: "var(--accent)" }}>
                    ⇓ download final.mp4
                  </a>
                  {(() => { const link = shareByJob.get(e.id); return link ? (
                    <a href={`/s/${link.token}`} target="_blank" className="mono" style={{ color: "var(--accent)" }}>⧉ open share link</a>
                  ) : (
                    <form action={createShareLinkAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="exportJobId" value={e.id} />
                      <SubmitButton small pendingLabel="Creating…">⧉ share</SubmitButton>
                    </form>
                  ); })()}
                </>
              )}
              {e.status === "failed" && (
                <>
                  <span className="muted">{e.errorDetail?.slice(0, 80)}</span>
                  <form action={retryExportAction}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="exportJobId" value={e.id} />
                    <SubmitButton small pendingLabel="Retrying…">↻ retry</SubmitButton>
                  </form>
                </>
              )}
              {(() => { const ex = exportSnapshots.get(e.snapshotId) ?? []; return ex.length > 0 ? (
                <span className="mono muted" style={{ fontSize: 10 }}>skipped: {ex.map((x) => x.title).join(", ")}</span>
              ) : null; })()}
            </div>
          ))}
        </section>
      )}

      {recentGens.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <p className="mono muted" style={{ fontSize: 10, marginBottom: 6 }}>RECENT GENERATIONS</p>
          {recentGens.map((g) => (
            <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <p className="mono muted" style={{ fontSize: 11 }}>
                {g.kind} · {g.modelId} · {g.status} · ${g.costUsd ?? "—"}{g.retryOf ? " · retry" : ""}{g.status === "failed" && g.errorCode ? ` · ${g.errorCode}` : ""}
              </p>
              {g.status === "failed" && (
                <form action={retryGenerationAction}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="generationId" value={g.id} />
                  <SubmitButton small pendingLabel="…">↻ retry</SubmitButton>
                </form>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
