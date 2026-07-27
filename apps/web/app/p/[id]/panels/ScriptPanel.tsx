// REQ-STB-060 — the script drawer: brief, versions, plan proposals, cast.
//
// Moved out of page.tsx VERBATIM. The props are destructured in the signature precisely so the
// JSX below needed no rewriting — extracting StagePanel by prefixing identifiers corrupted seven
// pieces of user-visible text ('use whole cast' became 'use whole props.cast').
import React from "react";
import { normalizePlannedShots } from "@avd/stb/plan-normalize";
import { castingGaps, normalizePlannedCast } from "@avd/stb/casting";
import { project } from "@avd/prj/schema";
import {
  applyPlanAction,
  castMemberAction,
  compileStyleCardAction,
  critiquePlanAction,
  critiqueScriptAction,
  draftScriptAction,
  proposePlanAction,
  setArchetypeAction,
  setTargetDurationAction,
  updateBriefAction,
} from "../../../actions";
import { Markdown } from "../../../../components/Markdown";
import { SubmitButton } from "../../../../components/SubmitButton";
import { card, input, label, sub, tiny, Section } from "./ui";
import { config, priceTable, styleCards } from "@avd/shared/config";
import { generation } from "@avd/gen/schema";
import { getMusicBrief, listShots } from "@avd/stb";
import { getProjectStyleCard } from "@avd/prj/service";
import { listEntities, listProjectEntities, listStyleKits } from "@avd/ast";
import { scriptVersion, shotPlanProposal } from "@avd/stb/schema";

export interface ScriptPanelProps {
  /** The project row. Named `p` because that is what it is called in the JSX moved from page.tsx. */
  p: typeof project.$inferSelect;
  activeKinds: Set<string>;
  briefIdea: string;
  cast: Awaited<ReturnType<typeof listProjectEntities>>;
  id: string;
  lastFailure: typeof generation.$inferSelect | undefined;
  latestScript: typeof scriptVersion.$inferSelect | undefined;
  music: Awaited<ReturnType<typeof getMusicBrief>>;
  projectCard: Awaited<ReturnType<typeof getProjectStyleCard>>;
  proposals: Array<typeof shotPlanProposal.$inferSelect>;
  shots: Awaited<ReturnType<typeof listShots>>;
  versions: Array<typeof scriptVersion.$inferSelect>;
}

export function ScriptPanel({ p, activeKinds, briefIdea, cast, id, lastFailure, latestScript, music, projectCard, proposals, shots, versions }: ScriptPanelProps) {
  return (
    <>
      {lastFailure && (
        <section style={{ ...card, marginBottom: 12, borderColor: "#7a4b3a" }}>
          <p className="mono" style={{ fontSize: 10.5, color: "#e0763a" }}>{lastFailure.kind} failed · {lastFailure.errorCode}: {lastFailure.errorDetail?.slice(0, 200)}</p>
          <p className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>
            {lastFailure.kind === "music"
              ? "The music model blocked this brief — regenerate the brief, then the track. Failures are never charged."
              : "Adjust the prompt and try again — failures are never charged."}
          </p>
        </section>
      )}
      <Section title="VIDEO PROMPT — feeds script, shots & music">
        <form action={updateBriefAction} style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <textarea name="idea" rows={3} defaultValue={String((p.brief as Record<string, unknown>)?.idea ?? "")}
            placeholder="e.g. a sunrise launch film for our energy drink — bold, kinetic, city waking up"
            style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 10px", color: "var(--ink)", fontSize: 12, resize: "vertical" }} />
          <SubmitButton small pendingLabel="Saving…">Save prompt</SubmitButton>
        </form>
        <form action={setArchetypeAction} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <select name="archetype" defaultValue={p.archetype ?? ""} className="mono" title="Directing style — injects the recipe into script, shot plan, music and picture prompts" style={{ ...tiny, flex: 1 }}>
            {/* Honest state: with a compiled card active the picker used to read "freeform". */}
            <option value="">{projectCard ? `directing: ✦ ${projectCard.name} (compiled)` : "directing: freeform"}</option>
            {Object.entries(styleCards).map(([k, a]) => <option key={k} value={k}>directing: {a.name}</option>)}
          </select>
          <SubmitButton small pendingLabel="…">Set</SubmitButton>
        </form>

        {/* REQ-PRJ-006: the runtime was shown in the header but nowhere editable. */}
        <form action={setTargetDurationAction} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <label className="mono muted" style={{ fontSize: 10 }}>runtime</label>
          <input name="seconds" type="number" min={config.project.minTargetSeconds} max={config.project.maxTargetSeconds}
            defaultValue={Math.round(Number(p.targetDurationS))} style={{ ...tiny, width: 66 }} />
          <span className="mono muted" style={{ fontSize: 10 }}>s — what the shot plan aims for</span>
          <SubmitButton small pendingLabel="…">Set</SubmitButton>
        </form>

        {/* SR-DIR-008: compile the prompt above into a seventh, project-specific card. */}
        <form action={compileStyleCardAction} style={{ marginTop: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <input type="hidden" name="brief" value={String((p.brief as Record<string, unknown>)?.idea ?? "")} />
          <SubmitButton small disabled={!briefIdea} pendingLabel="Researching the style…">
            ✦ Direct from my prompt {briefIdea ? "· free" : "· save a prompt first"}
          </SubmitButton>
          <p className="mono muted" style={{ fontSize: 9, marginTop: 4 }}>
            Names a director, film or genre in your prompt? This researches it and compiles the look into craft
            direction — framing, camera, palette, pacing, and what the style refuses.
          </p>
        </form>

        {projectCard && (
          <div style={{ ...sub, marginTop: 8, borderColor: "var(--accent)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <p className="mono" style={{ fontSize: 11, fontWeight: 700 }}>✦ {projectCard.name}</p>
              <span className="mono muted" style={{ fontSize: 9 }}>compiled from your prompt · overrides the picker</span>
            </div>
            {projectCard.provenance.references.length > 0 && (
              <p className="mono muted" style={{ fontSize: 9, marginTop: 3 }}>
                researched: {projectCard.provenance.references.join(" · ")} — kept for reference only, never sent to an image model
              </p>
            )}
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px", margin: "7px 0 0", fontSize: 10.5 }}>
              <dt className="mono muted">camera</dt>
              <dd style={{ margin: 0 }}>{projectCard.camera.allowedMovements.join(", ")} · {projectCard.camera.preferredSizes.join("/")}</dd>
              <dt className="mono muted">pacing</dt>
              <dd style={{ margin: 0 }}>{projectCard.pacing.durationWindowS.join("–")}s per shot{projectCard.structure.shotCountHint ? ` · ${projectCard.structure.shotCountHint.join("–")} shots` : ""}</dd>
              <dt className="mono muted">palette</dt>
              <dd style={{ margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: projectCard.palette.accent, border: "1px solid var(--line)" }} />
                <span style={{ width: 10, height: 10, borderRadius: 2, background: projectCard.palette.background, border: "1px solid var(--line)" }} />
                <span className="muted">{projectCard.palette.notes}</span>
              </dd>
              {projectCard.humour && (<><dt className="mono muted">humour</dt><dd style={{ margin: 0 }}>{projectCard.humour}</dd></>)}
              <dt className="mono muted">refuses</dt>
              <dd style={{ margin: 0 }}>{projectCard.antiNotes.join(" · ")}</dd>
            </dl>
          </div>
        )}
      </Section>

      <Section
        title={latestScript ? `SCRIPT · v${latestScript.version} · ${versions.length} version${versions.length > 1 ? "s" : ""}` : "SCRIPT"}
        action={
          <>
            {latestScript && (
              // REQ-STB-052: catch runtime, structure and casting faults HERE, before the script
              // is broken into shots and the fault is split across ten of them.
              <form action={critiqueScriptAction}>
                <input type="hidden" name="projectId" value={id} />
                <SubmitButton small disabled={activeKinds.has("script")}
                  title="Four reviewers read the script — runtime, story, cast, voice — and write an improved version"
                  pendingLabel="Reviewing…">↻ Critique &amp; improve</SubmitButton>
              </form>
            )}
            <form action={draftScriptAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton small primary={!latestScript} disabled={activeKinds.has("script")} pendingLabel="Drafting…">
                {latestScript ? "Redraft" : "Draft script"}
              </SubmitButton>
            </form>
            <form action={proposePlanAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton small primary disabled={!latestScript || activeKinds.has("shot_plan")} pendingLabel="Planning…">
                Break into shots
              </SubmitButton>
            </form>
          </>
        }
      >
        {latestScript ? (
          <div style={{ fontSize: 12.5 }}><Markdown>{latestScript.content}</Markdown></div>
        ) : (
          <p className="muted" style={{ fontSize: 12 }}>No script yet — draft one from the video prompt.</p>
        )}
      </Section>

      {proposals.map((prop) => {
        const planned = normalizePlannedShots(prop.changes);
        // REQ-STB-048: who this plan needs on screen that the project has not cast yet.
        const gaps = castingGaps(normalizePlannedCast(prop.changes), cast.map((e) => ({ name: e.name, refAssetIds: e.refAssetIds })));
        return (
          <Section
            key={prop.id}
            title={`SHOT PLAN · ${prop.status}`}
            action={prop.status === "proposed" ? (
              <form action={applyPlanAction} style={{ display: "flex", gap: 6 }}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="proposalId" value={prop.id} />
                <SubmitButton small formAction={critiquePlanAction}
                  title="Four reviewers read this plan — pacing, continuity, casting, story — and propose a fixed one"
                  pendingLabel="Reviewing…">↻ Critique &amp; improve</SubmitButton>
                <SubmitButton small title="Replaces shots with no takes; shots with takes are kept (INV-STB-007)" pendingLabel="…">Apply {planned.length}</SubmitButton>
                <SubmitButton small primary name="generateFrames" value="1" title="Apply and generate the first frames" pendingLabel="…">Apply + frames</SubmitButton>
              </form>
            ) : undefined}
          >
            {gaps.length > 0 && (
              <div style={{ ...sub, marginBottom: 10, borderColor: "var(--accent)" }}>
                <p className="mono" style={{ fontSize: 10.5, marginBottom: 2 }}>
                  ✦ CASTING — {gaps.length} {gaps.length === 1 ? "entry has" : "entries have"} no reference image
                </p>
                <p className="mono muted" style={{ fontSize: 9.5, marginBottom: 8 }}>
                  Without one, the image model re-invents them in every shot — a face becomes a different face,
                  a room becomes a different room. Generate a reference from the description, or upload your own.
                </p>
                {gaps.map((c) => (
                  <form key={c.name} action={castMemberAction} encType="multipart/form-data"
                    style={{ display: "grid", gap: 5, borderTop: "1px solid var(--line)", paddingTop: 7, marginTop: 7 }}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="name" value={c.name} />
                    <input type="hidden" name="kind" value={c.kind} />
                    <input type="hidden" name="description" value={c.description} />
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <b style={{ fontSize: 12 }}>{c.name}</b>
                      <span className="mono muted" style={{ fontSize: 9.5 }}>{c.kind}</span>
                    </div>
                    <textarea name="appearance" rows={2} defaultValue={c.appearance}
                      style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 7px", color: "var(--ink)", fontSize: 10.5, fontFamily: "var(--mono)", resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <SubmitButton small primary pendingLabel="Generating…">✦ Generate {c.kind === "location" ? "scene plate" : "portrait"} ≈ $0.07</SubmitButton>
                      <label className="mono muted" style={{ fontSize: 9.5, display: "flex", gap: 5, alignItems: "center" }}>
                        or upload
                        <input type="file" name="portrait" accept="image/*" style={{ fontSize: 9.5, maxWidth: 180 }} />
                      </label>
                    </div>
                  </form>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gap: 5 }}>
              {planned.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, borderTop: "1px solid var(--line)", paddingTop: 5 }}>
                  <span className="mono muted">{i + 1}</span>
                  <b style={{ flex: "0 0 auto" }}>{s.title}</b>
                  <span className="muted" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.direction.synopsis}</span>
                  <span className="mono muted" style={{ marginLeft: "auto" }}>{s.durationS}s</span>
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}
