// REQ-STB-048 (USER 2026-07-27) — the plan casts the film, not just Pasi.
//
// "the other characters than Pasi in this movie are not kept… director should think of cast and
// list them, allowing to generate images for other cast needed in this movie."
//
// Only cast entities carry reference images, and reference images are what make a face the same
// face twice. Anyone the script invents but the project never cast — "the colleague" — is
// re-imagined by the image model in every shot, and in one shot it gave up and drew Pasi twice.
// So the planner now names everyone the film needs, and anyone missing can be cast before shooting.
import type { EntityKind } from "@avd/shared/config";

export interface PlannedCastMember {
  name: string;
  kind: EntityKind;
  /** Short identity line — what this entity IS. Stored as the entity description. */
  description: string;
  /** Concrete, repeatable physical description — the seed for a reference portrait. */
  appearance: string;
}

const KINDS: readonly EntityKind[] = ["company", "product", "person", "character"];
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const key = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Pull the cast list out of a planner response. Tolerant: a plan without cast is not an error. */
export function normalizePlannedCast(raw: unknown): PlannedCastMember[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { cast?: unknown }).cast;
  if (!Array.isArray(list)) return [];

  const out: PlannedCastMember[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const name = str(c.name);
    if (!name || seen.has(key(name))) continue; // no name = nothing to cast; same name twice = one part
    seen.add(key(name));
    const appearance = str(c.appearance) || str(c.look) || str(c.description);
    const kindRaw = str(c.kind).toLowerCase() as EntityKind;
    out.push({
      name,
      // A planner inventing "wizard" or omitting the kind still describes a body on screen.
      kind: KINDS.includes(kindRaw) ? kindRaw : "character",
      description: str(c.description) || appearance,
      appearance,
    });
  }
  return out;
}

/**
 * Who still needs casting. A member already on the project counts as cast ONLY if it has at least
 * one reference image — an entity with no refs contributes nothing to consistency, which is the
 * whole point of casting.
 */
export function castingGaps(
  planned: PlannedCastMember[],
  existing: Array<{ name: string; refAssetIds?: string[] }>
): PlannedCastMember[] {
  const cast = new Set(
    existing.filter((e) => e.refAssetIds === undefined || e.refAssetIds.length > 0).map((e) => key(e.name))
  );
  return planned.filter((c) => !cast.has(key(c.name)));
}

/**
 * REQ-STB-049 (USER 2026-07-27: "modernpath logo is put to almost every scene, I want AI to decide
 * which of the cast should be placed as reference images scene by scene").
 *
 * Which entities a shot is conditioned on. Every shot previously fell back to the WHOLE cast, so a
 * close-up of a face in a tram carried the company logo as a reference and named the brand in its
 * prompt. Returns null when the shot names nobody — a graphic card needs no references at all, and
 * null is what `shot.refAssetIds` stores to mean "not chosen".
 */
export function resolveShotCast(
  names: string[] | undefined,
  cast: Array<{ id: string; name: string; refAssetIds: string[] }>
): { entityIds: string[]; refAssetIds: string[] } | null {
  if (!names?.length) return null;
  const wanted = new Set(names.map(key));
  const hits = cast.filter((e) => wanted.has(key(e.name)));
  if (!hits.length) return null;
  return {
    entityIds: hits.map((e) => e.id),
    refAssetIds: [...new Set(hits.flatMap((e) => e.refAssetIds))],
  };
}
