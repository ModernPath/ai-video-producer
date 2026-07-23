"use client";
// USER 2026-07-23: click a small image to view it large (lightbox overlay).
import { useEffect, useState, type CSSProperties } from "react";

export function ZoomImage({ src, alt, style }: { src: string; alt: string; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        title="Click to enlarge"
        style={{ cursor: "zoom-in", ...style }}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label={`${alt} (enlarged — click or press Escape to close)`}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(5,6,9,.88)",
            display: "grid", placeItems: "center", cursor: "zoom-out", padding: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src.replace(/[?&]thumb=1/, "")} alt={alt} style={{ maxWidth: "94vw", maxHeight: "92vh", borderRadius: 10, border: "1px solid var(--line)", boxShadow: "0 24px 80px rgba(0,0,0,.6)" }} />
        </div>
      )}
    </>
  );
}
