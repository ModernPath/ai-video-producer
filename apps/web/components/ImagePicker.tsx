"use client";
// REQ-AST-009 (USER bug): big images killed server actions (1MB). This picker decodes
// any browser-supported format, downscales to config.maxEdgePx, re-encodes JPEG, swaps
// the processed files into the form input, and shows previews before submit.
import { useRef, useState } from "react";

const MAX_EDGE = 2048;
const QUALITY = 0.85;

interface Preview {
  name: string;
  url: string;
  kb: number;
  error?: string;
}

async function shrink(file: File): Promise<{ file: File; url: string } | { error: string }> {
  try {
    const bitmap = await createImageBitmap(file); // decodes png/jpeg/webp/gif/bmp/avif…
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", QUALITY)
    );
    const out = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    return { file: out, url: URL.createObjectURL(blob) };
  } catch {
    return { error: `Couldn't read "${file.name}" — format not supported by this browser` };
  }
}

export function ImagePicker({ name, multiple }: { name: string; multiple?: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [busy, setBusy] = useState(false);

  async function onChange() {
    const input = inputRef.current;
    if (!input?.files?.length) return;
    setBusy(true);
    const dt = new DataTransfer();
    const next: Preview[] = [];
    for (const f of Array.from(input.files)) {
      const r = await shrink(f);
      if ("error" in r) {
        next.push({ name: f.name, url: "", kb: Math.round(f.size / 1024), error: r.error });
      } else {
        dt.items.add(r.file);
        next.push({ name: r.file.name, url: r.url, kb: Math.round(r.file.size / 1024) });
      }
    }
    input.files = dt.files; // the form submits the processed files
    setPreviews(next);
    setBusy(false);
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple={multiple}
        onChange={onChange}
        className="mono"
        style={{ fontSize: 11, color: "var(--ink-2)" }}
      />
      {busy && <span className="mono muted" style={{ fontSize: 10 }}>shrinking…</span>}
      {previews.map((p) =>
        p.error ? (
          <span key={p.name} className="mono" style={{ fontSize: 10, color: "#e0763a" }}>{p.error}</span>
        ) : (
          <span key={p.name} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.name} style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 5, border: "1px solid var(--line)" }} />
            <span className="mono muted" style={{ fontSize: 9 }}>{p.kb}KB</span>
          </span>
        )
      )}
    </span>
  );
}
