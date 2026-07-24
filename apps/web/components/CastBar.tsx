// REQ-STB-033 (USER 2026-07-24 usability): the cast — what actually feeds every prompt — must be
// visible and editable from EVERY view, with ref thumbnails and a profile indicator so there is
// never a question about "what content is being included in the prompt".
import Link from "next/link";
import { setCastAction } from "../app/actions";
import { SubmitButton } from "./SubmitButton";

export interface CastBarEntity {
  id: string;
  kind: string;
  name: string;
  refAssetIds: string[];
  hasProfile: boolean;
}

export function CastBar({ projectId, entities, castIds, note }: {
  projectId: string;
  entities: CastBarEntity[];
  castIds: Set<string>;
  note?: string;
}) {
  if (!entities.length) {
    return (
      <section style={{ border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 14, marginTop: 16 }}>
        <p className="muted" style={{ fontSize: 12 }}>
          No cast yet — create companies, products, people in the <Link href="/library" style={{ color: "var(--accent)" }}>library →</Link>
        </p>
      </section>
    );
  }
  return (
    <section style={{ border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 14, marginTop: 16 }}>
      <form action={setCastAction} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="projectId" value={projectId} />
        <p className="mono muted" style={{ fontSize: 10 }}>CAST · {note ?? "checked members feed every prompt"}</p>
        {entities.map((e) => (
          <label key={e.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px" }}>
            <input type="checkbox" name="entityIds" value={e.id} defaultChecked={castIds.has(e.id)} />
            {e.refAssetIds[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/assets/${e.refAssetIds[0]}?thumb=1`} alt="" style={{ width: 26, height: 26, borderRadius: 5, objectFit: "cover", border: "1px solid var(--line)" }} />
            ) : (
              <span title="no reference images — designs will drift" style={{ width: 26, height: 26, borderRadius: 5, border: "1px dashed var(--line)", display: "grid", placeItems: "center", fontSize: 10 }}>?</span>
            )}
            <span className="mono muted" style={{ fontSize: 9, textTransform: "uppercase" }}>{e.kind}</span> {e.name}
            {e.hasProfile && <span className="mono" title="long-form profile feeds script/plan/music prompts" style={{ fontSize: 9, color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 4, padding: "0 4px" }}>profile</span>}
          </label>
        ))}
        <SubmitButton small pendingLabel="Saving…">Save cast</SubmitButton>
        <Link href="/library" className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>library →</Link>
      </form>
    </section>
  );
}
