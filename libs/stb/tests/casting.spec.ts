import { describe, expect, it } from "vitest";
import { entityKinds } from "@avd/shared/config";
import { castingGaps, normalizePlannedCast, resolveShotCast } from "../src/casting";
import { normalizePlannedShots } from "../src/plan-normalize";

// USER 2026-07-27: "the other characters than Pasi in this movie are not kept. In the script
// planning, I think that director should think of cast and list them, allowing to generate images
// for other cast needed in this movie. In that way all characters would be consistent."
//
// Today only Pasi is a cast entity with reference images, so "the colleague" is re-invented by the
// image model in every shot he appears in — and in `Synchronized Drink` it simply drew Pasi twice.
// A real director casts every speaking body before shooting; this is the planner doing the same.

describe("REQ-STB-048: the plan names the cast the film needs", () => {
  it("reads the cast a planner returned alongside the shots", () => {
    const cast = normalizePlannedCast({
      cast: [
        { name: "The Colleague", kind: "character", description: "Pasi's silent co-worker", appearance: "Stocky Finnish man, 50s, grey moustache, brown corduroy jacket" },
      ],
      shots: [],
    });
    expect(cast).toEqual([{
      name: "The Colleague", kind: "character",
      description: "Pasi's silent co-worker",
      appearance: "Stocky Finnish man, 50s, grey moustache, brown corduroy jacket",
    }]);
  });

  it("returns nothing when the plan named no cast, rather than failing", () => {
    expect(normalizePlannedCast({ shots: [] })).toEqual([]);
    expect(normalizePlannedCast(null)).toEqual([]);
    expect(normalizePlannedCast({ cast: "not a list" })).toEqual([]);
  });

  it("drops entries with no name — there is nothing to cast", () => {
    expect(normalizePlannedCast({ cast: [{ description: "someone" }, { name: "  " }] })).toEqual([]);
  });

  it("defaults an unknown or missing kind to character", () => {
    const [a, b] = normalizePlannedCast({ cast: [{ name: "A" }, { name: "B", kind: "wizard" }] });
    expect(a!.kind).toBe("character");
    expect(b!.kind).toBe("character");
  });

  it("keeps the kinds the entity model actually has", () => {
    const kinds = normalizePlannedCast({
      cast: [{ name: "A", kind: "person" }, { name: "B", kind: "product" }, { name: "C", kind: "company" }],
    }).map((c) => c.kind);
    expect(kinds).toEqual(["person", "product", "company"]);
  });

  it("falls back to the appearance when a planner writes no description", () => {
    const [c] = normalizePlannedCast({ cast: [{ name: "The Colleague", appearance: "Stocky man in corduroy" }] });
    expect(c!.description).toBe("Stocky man in corduroy");
  });

  it("de-duplicates a name the planner listed twice", () => {
    expect(normalizePlannedCast({ cast: [{ name: "The Colleague" }, { name: "the colleague" }] })).toHaveLength(1);
  });
});

describe("REQ-STB-048: only the cast that is missing needs casting", () => {
  const planned = normalizePlannedCast({
    cast: [
      { name: "Pasi", kind: "person", appearance: "already cast" },
      { name: "The Colleague", kind: "character", appearance: "Stocky Finnish man in corduroy" },
      { name: "ModernPath", kind: "company", appearance: "logo" },
    ],
  });

  it("lists only those the project has not cast yet", () => {
    expect(castingGaps(planned, [{ name: "Pasi" }, { name: "ModernPath" }]).map((c) => c.name)).toEqual(["The Colleague"]);
  });

  it("matches existing cast case- and space-insensitively, so nobody is cast twice", () => {
    expect(castingGaps(planned, [{ name: " pasi " }, { name: "modernpath" }, { name: "THE COLLEAGUE" }])).toEqual([]);
  });

  it("returns everyone when the project has no cast at all", () => {
    expect(castingGaps(planned, [])).toHaveLength(3);
  });

  it("treats a cast member with no reference images as still needing one", () => {
    const gaps = castingGaps(planned, [{ name: "Pasi", refAssetIds: [] }, { name: "ModernPath", refAssetIds: ["a"] }]);
    expect(gaps.map((c) => c.name)).toEqual(["Pasi", "The Colleague"]);
  });
});

// The proposal row stores `changes`, and it stored a BARE ARRAY of shots — so a cast the planner
// returned was discarded on the way into the database, before any UI could offer to cast it.
describe("REQ-STB-048: the stored proposal keeps the cast beside the shots", () => {
  const stored = {
    cast: [{ name: "The Colleague", kind: "character", appearance: "Stocky man in corduroy" }],
    shots: [{ title: "Diner", durationS: 6, synopsis: "two men", shotSize: "WS" }],
  };

  it("reads the cast back out of the object shape", () => {
    expect(normalizePlannedCast(stored).map((c) => c.name)).toEqual(["The Colleague"]);
  });

  it("still reads the shots out of it — the shape change must not break planning", () => {
    expect(normalizePlannedShots(stored)).toHaveLength(1);
  });

  it("still reads shots from the old bare-array rows already in the database", () => {
    expect(normalizePlannedShots(stored.shots)).toHaveLength(1);
    expect(normalizePlannedCast(stored.shots)).toEqual([]); // no cast in a legacy row, and that is fine
  });
});

// USER 2026-07-27: "e.g. modernpath logo is put to almost every scene, I want AI to decide which of
// the cast should be placed as reference images scene by scene."
//
// `resolveShotRefs` falls back to the WHOLE cast when a shot has no explicit refs, so every shot is
// conditioned on the company logo and every prompt names it — including a close-up of a face in a
// tram. The plan now says who is IN each shot, and only those references are attached.
describe("REQ-STB-049: each shot is conditioned on the cast that is actually in it", () => {
  const cast = [
    { id: "e-pasi", name: "Pasi", refAssetIds: ["a-pasi"] },
    { id: "e-col", name: "Colleague", refAssetIds: ["a-col1", "a-col2"] },
    { id: "e-mp", name: "ModernPath", refAssetIds: ["a-logo"] },
  ];

  it("resolves the named members to their ids and reference images", () => {
    expect(resolveShotCast(["Pasi"], cast)).toEqual({ entityIds: ["e-pasi"], refAssetIds: ["a-pasi"] });
  });

  it("keeps the logo out of a shot the brand is not in — the whole point", () => {
    expect(resolveShotCast(["Pasi", "Colleague"], cast)!.refAssetIds).not.toContain("a-logo");
  });

  it("carries every reference image a named member has", () => {
    expect(resolveShotCast(["Colleague"], cast)!.refAssetIds).toEqual(["a-col1", "a-col2"]);
  });

  it("matches names case- and space-insensitively, as the planner writes them loosely", () => {
    expect(resolveShotCast([" modernpath ", "PASI"], cast)!.entityIds).toEqual(["e-pasi", "e-mp"]);
  });

  it("ignores a name nobody has been cast under, rather than failing the shot", () => {
    expect(resolveShotCast(["Pasi", "A Passing Dog"], cast)!.entityIds).toEqual(["e-pasi"]);
  });

  it("returns null for a shot that named nobody — a graphic card needs no references at all", () => {
    expect(resolveShotCast([], cast)).toBeNull();
    expect(resolveShotCast(undefined, cast)).toBeNull();
  });

  it("de-duplicates a member the planner listed twice", () => {
    expect(resolveShotCast(["Pasi", "pasi"], cast)!.refAssetIds).toEqual(["a-pasi"]);
  });
});

// USER 2026-07-27, across four takes of the same canteen: "It's still a problem that the cafe
// setting all the time changes. Maybe we should also generate a scene reference image for clips
// that belong at same scene?"
//
// Exactly the character problem again, one level up: the booth, the bench, the wall and the table
// were re-invented in every shot because nothing held the SPACE fixed. A location is cast like
// anyone else — it gets a reference image and the shots set there are conditioned on it.
describe("REQ-STB-053: a scene is cast like a character", () => {
  it("accepts location as a kind the planner can return", () => {
    const [c] = normalizePlannedCast({ cast: [{ name: "The Canteen", kind: "location", appearance: "A worn municipal canteen" }] });
    expect(c!.kind).toBe("location");
  });

  it("finds a location with no reference image, exactly like a character", () => {
    const planned = normalizePlannedCast({
      cast: [{ name: "The Canteen", kind: "location", appearance: "worn booths" }, { name: "Pasi", kind: "person" }],
    });
    expect(castingGaps(planned, [{ name: "Pasi", refAssetIds: ["a"] }]).map((c) => c.name)).toEqual(["The Canteen"]);
  });

  it("attaches the scene plate to every shot set there, alongside the people", () => {
    const cast = [
      { id: "e-pasi", name: "Pasi", refAssetIds: ["a-pasi"] },
      { id: "e-canteen", name: "The Canteen", refAssetIds: ["a-canteen"] },
    ];
    const resolved = resolveShotCast(["Pasi", "The Canteen"], cast);
    expect(resolved!.refAssetIds).toEqual(["a-pasi", "a-canteen"]);
  });

  it("keeps a shot in a different place free of the canteen plate", () => {
    const cast = [
      { id: "e-pasi", name: "Pasi", refAssetIds: ["a-pasi"] },
      { id: "e-canteen", name: "The Canteen", refAssetIds: ["a-canteen"] },
      { id: "e-corridor", name: "The Corridor", refAssetIds: ["a-corridor"] },
    ];
    expect(resolveShotCast(["Pasi", "The Corridor"], cast)!.refAssetIds).not.toContain("a-canteen");
  });
});

// REQ-GEN-033 / CLAUDE.md §1.11 — the vocabulary is DERIVED, not copied.
// Regression: this module kept its own ["company","product","person","character"], so when
// `location` was added to the shared list, casting silently returned `character` for it.
describe("REQ-GEN-033: entity kinds have one definition and casting derives from it", () => {
  it("accepts every kind the shared vocabulary declares, including ones added later", () => {
    expect(entityKinds).toContain("location");
    const cast = normalizePlannedCast({
      cast: entityKinds.map((kind, i) => ({ name: `E${i}`, kind, description: "d", appearance: "a" })),
      shots: [],
    });
    expect(cast.map((c) => c.kind)).toEqual([...entityKinds]);
  });
});
