// REQ-ANM-004: composable effect primitives (props, never model code).
// Sources: remotion.dev/docs/{noise-visualization,light-leaks,text-highlights,animation-math}.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

export interface EffectProps {
  lightLeak?: boolean;
  grain?: boolean;
}

/** Warm drifting light leaks — two noise-driven radial glows, screen-blended. */
export const LightLeaks: React.FC<{ accent?: string }> = ({ accent = "#e8b04b" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 60;
  const x1 = interpolate(noise2D("leak-x1", t, 0), [-1, 1], [-0.2, 0.7]) * width;
  const y1 = interpolate(noise2D("leak-y1", 0, t), [-1, 1], [-0.2, 0.5]) * height;
  const x2 = interpolate(noise2D("leak-x2", t * 0.7, 5), [-1, 1], [0.4, 1.2]) * width;
  const y2 = interpolate(noise2D("leak-y2", 5, t * 0.7), [-1, 1], [0.5, 1.2]) * height;
  const glow = (x: number, y: number, r: number, color: string, opacity: number): React.CSSProperties => ({
    position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2,
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    opacity, mixBlendMode: "screen", pointerEvents: "none",
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={glow(x1, y1, width * 0.45, accent, 0.34)} />
      <div style={glow(x2, y2, width * 0.55, "#ff7a45", 0.22)} />
    </AbsoluteFill>
  );
};

/** Subtle animated film grain via SVG turbulence, opacity flickered per frame. */
export const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = (frame % 7) + 1; // cycle turbulence seeds for shimmer
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.07 }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Animated highlight sweep behind a word (text-highlights doc pattern). */
export const Highlight: React.FC<{ children: React.ReactNode; accent?: string; startFrame?: number }> = ({
  children, accent = "#e8b04b", startFrame = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [startFrame, startFrame + fps / 2], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <span style={{
      backgroundImage: `linear-gradient(${accent}66, ${accent}66)`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${progress}% 42%`,
      backgroundPosition: "0 78%",
      borderRadius: 6, padding: "0 0.08em",
    }}>
      {children}
    </span>
  );
};
