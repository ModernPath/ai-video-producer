// REQ-ANM-001: server-side Remotion render — template + props in, mp4 bytes out.
// Bundle is webpack-built once per process and cached (first call is the slow one).
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface AnimationInput {
  template: "title" | "lower-third";
  text: string;
  subtext?: string | undefined;
  durationS: number;
  aspectRatio: "16:9" | "9:16";
}

let bundlePromise: Promise<string> | null = null;

async function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const { bundle } = await import("@remotion/bundler");
      return bundle({ entryPoint: join(import.meta.dirname, "index.ts") });
    })();
  }
  return bundlePromise;
}

export async function renderAnimation(input: AnimationInput): Promise<{ bytes: Uint8Array; mime: string; durationS: number }> {
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await getBundle();
  const inputProps = {
    text: input.text,
    subtext: input.subtext,
    durationS: input.durationS,
    aspectRatio: input.aspectRatio,
  };
  const transparent = input.template === "lower-third"; // REQ-ANM-002: alpha webm for compositing
  const composition = await selectComposition({
    serveUrl,
    id: input.template === "lower-third" ? "LowerThird" : "TitleCard",
    inputProps,
  });
  const dir = mkdtempSync(join(tmpdir(), "avd-anm-"));
  const outputLocation = join(dir, transparent ? "out.webm" : "out.mp4");
  try {
    await renderMedia({
      composition,
      serveUrl,
      codec: transparent ? "vp8" : "h264",
      ...(transparent ? { imageFormat: "png" as const, pixelFormat: "yuva420p" as const } : {}),
      outputLocation,
      inputProps,
    });
    return {
      bytes: new Uint8Array(readFileSync(outputLocation)),
      mime: transparent ? "video/webm" : "video/mp4",
      durationS: input.durationS,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
