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
