// Mock-mode fixture media (REQ-GEN-015 / REQ-AST-002): real bytes, zero provider cost.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const palettes = [
  ["#2b3a67", "#7a4b8f", "#e0763a"],
  ["#101c22", "#1e4e55", "#4d9aa0"],
  ["#331a4d", "#8b2f7a", "#ff7b54"],
  ["#0b2740", "#0e7f8f", "#e94fa1"],
  ["#4d1d12", "#a34a1e", "#f0c05a"],
];

export function fixtureSvg(seed: string, label: string, aspectRatio: "16:9" | "9:16"): Uint8Array {
  const [w, h] = aspectRatio === "16:9" ? [1280, 720] : [720, 1280];
  const n = [...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const [c1, c2, c3] = palettes[n % palettes.length]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <text x="24" y="${h - 28}" font-family="monospace" font-size="24" fill="rgba(255,255,255,.85)">${label}</text>
</svg>`;
  return new TextEncoder().encode(svg);
}

export function fixtureScript(i: { projectTitle: string; brief: Record<string, unknown>; targetDurationSeconds: number }): string {
  return [
    `# ${i.projectTitle} — draft script (mock)`,
    ``,
    `COLD OPEN — establishing`,
    `The world of "${String(i.brief["idea"] ?? i.projectTitle)}" wakes up. First light, held breath.`,
    ``,
    `BUILD — motion`,
    `Momentum gathers; the subject moves through the space with intent.`,
    ``,
    `PAYOFF — reveal`,
    `The hero moment lands. Hold, then cut to black. (${i.targetDurationSeconds}s target)`,
  ].join("\n");
}

export function fixtureMusicBrief(i: { projectTitle: string; brief: Record<string, unknown>; targetDurationSeconds: number }): string {
  return [
    `Style: cinematic electronic, driving pulse, dawn-light warmth. (mock)`,
    `Mood: ${String(i.brief["tone"] ?? "uplifting, focused")} — builds to a confident drop, clean outro.`,
    `Structure: intro riser -> groove -> peak at two-thirds -> hard button ending.`,
    `Length: about ${i.targetDurationSeconds} seconds. Instrumental only, no vocals.`,
    `Context: soundtrack for "${i.projectTitle}" — ${String(i.brief["idea"] ?? "brand video")}.`,
  ].join("\n");
}

const beatTitles = ["Cold open", "The wake", "Momentum", "Close-up beat", "Crowd swell", "Hero reveal", "Logo out"];

export function fixtureShotPlan(i: { projectTitle: string; targetDurationSeconds: number; minS: number; maxS: number; entities?: { name: string }[] }) {
  const n = Math.min(beatTitles.length, Math.max(3, Math.round(i.targetDurationSeconds / 6)));
  const base = Math.min(i.maxS, Math.max(i.minS, Math.round(i.targetDurationSeconds / n)));
  const castNames = (i.entities ?? []).map((e) => e.name).join(", ");
  return beatTitles.slice(0, n).map((title, idx) => {
    const camera = idx % 2 === 0 ? "wide, slow push-in" : "close, handheld energy";
    const action = idx === 0 ? "slow reveal" : idx === n - 1 ? "hold and settle" : "dynamic movement";
    const castPart = castNames ? ` featuring ${castNames}` : "";
    return {
      title: `${title}`,
      durationS: Math.min(i.maxS, Math.max(i.minS, base + (idx % 2 === 0 ? 0 : -1))),
      direction: {
        synopsis: `${title} of ${i.projectTitle}`,
        subject: "hero subject",
        action,
        camera,
        mood: "cinematic dawn light",
      },
      // REQ-STB-014: authored, production-ready prompts (mock approximation of the real model's output)
      imagePrompt: `${title} of ${i.projectTitle}${castPart} — cinematic still, ${camera}, dawn light, high detail (mock)`,
      videoPrompt: `${title} of ${i.projectTitle}${castPart} — ${action}, ${camera}, cinematic dawn light, natural motion (mock)`,
    };
  });
}

export function fixtureMp4(): Uint8Array {
  const candidates = [
    process.env.FIXTURES_DIR,
    join(process.cwd(), "fixtures"),
    join(process.cwd(), "..", "..", "fixtures"),
  ].filter((p): p is string => !!p);
  for (const dir of candidates) {
    const p = join(dir, "take-10s.mp4");
    if (existsSync(p)) return new Uint8Array(readFileSync(p));
  }
  throw new Error(`fixture take-10s.mp4 not found in: ${candidates.join(", ")} — run the docker ffmpeg step (see LOG)`);
}
