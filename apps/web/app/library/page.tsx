import Link from "next/link";
import { listEntities } from "@avd/ast";
import { organization } from "@avd/plt/schema";
import { createEntityAction, editEntityRefAction } from "../actions";
import { SubmitButton } from "../../components/SubmitButton";
import { db } from "../../lib/db";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 16 };
const input: React.CSSProperties = { background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 9px", color: "var(--ink)", fontSize: 12 };

export default async function LibraryPage() {
  const d = db();
  const [org] = await d.select().from(organization).limit(1);
  const entities = org ? await listEntities(d, org.id) : [];

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "36px 24px" }}>
      <p className="mono muted" style={{ fontSize: 12 }}>
        <Link href="/">← projects</Link>
      </p>
      <h1 className="disp" style={{ fontSize: 22, marginTop: 8 }}>
        Library — Cast &amp; Brand
        <span aria-hidden style={{ display: "inline-block", width: "0.4em", height: "0.4em", borderRadius: "50%", background: "var(--accent)", marginLeft: "0.3em" }} />
      </h1>
      <p className="muted" style={{ fontSize: 13, marginTop: 6, maxWidth: "60ch" }}>
        Reusable entities — companies, products, people, characters — with reference images.
        Attach them to a project’s cast and every frame and take carries them.
      </p>

      <section style={{ ...card, marginTop: 20 }}>
        <p className="mono muted" style={{ fontSize: 10, marginBottom: 10 }}>NEW ENTITY</p>
        <form action={createEntityAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select name="kind" style={input}>
            <option value="character">character</option>
            <option value="person">person</option>
            <option value="product">product</option>
            <option value="company">company</option>
          </select>
          <input name="name" placeholder="Name" required style={{ ...input, flex: "1 1 140px" }} />
          <input name="description" placeholder="Description (feeds every prompt)" required style={{ ...input, flex: "2 1 260px" }} />
          <input type="file" name="refs" accept="image/png,image/jpeg,image/webp" multiple className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }} />
          <SubmitButton primary pendingLabel="Creating…">Create entity</SubmitButton>
        </form>
        <p className="mono muted" style={{ fontSize: 10, marginTop: 8 }}>1–5 reference images (INV-AST-004)</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 18 }}>
        {entities.map((e) => (
          <div key={e.id} style={card}>
            <p className="mono muted" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>{e.kind}</p>
            <p style={{ fontWeight: 600, marginTop: 2 }}>{e.name}</p>
            <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{e.description}</p>
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              {e.refAssetIds.map((rid) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={rid} src={`/api/assets/${rid}`} alt="" style={{ width: 38, height: 38, borderRadius: 6, objectFit: "cover", border: "1px solid var(--line)" }} />
              ))}
            </div>
            <form action={editEntityRefAction} style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input type="hidden" name="entityId" value={e.id} />
              <input type="hidden" name="refAssetId" value={e.refAssetIds[0]} />
              <input name="instruction" placeholder="AI-edit ref 1… (e.g. make it night)" style={{ background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 8px", color: "var(--ink)", fontSize: 11, flex: 1 }} />
              <SubmitButton small pendingLabel="Editing…">✎ Edit</SubmitButton>
            </form>
          </div>
        ))}
        {entities.length === 0 && <p className="muted" style={{ fontSize: 12 }}>No entities yet.</p>}
      </section>
    </main>
  );
}
