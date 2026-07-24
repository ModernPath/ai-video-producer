// REQ-ANM-006: checklist reveal — heading from `text`, items from `subtext` split on "|" or
// newlines, each popping in sequentially with an accent check.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmGrain, LightLeaks } from "./effects";

export interface ChecklistProps {
  text: string;
  subtext?: string;
  accent?: string;
  background?: string;
  lightLeak?: boolean;
  grain?: boolean;
}

export const Checklist: React.FC<ChecklistProps> = ({
  text,
  subtext,
  accent = "#e8b04b",
  background = "#12151b",
  lightLeak = true,
  grain = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const items = (subtext ?? "").split(/[|\n·]+/).map((s) => s.trim()).filter(Boolean);

  const headEnter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.min(24, durationInFrames / 2) });
  const fadeOut = interpolate(frame, [durationInFrames - fps / 2, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // items start after the heading and finish by ~80% of the shot
  const firstItemFrame = Math.round(fps * 0.5);
  const perItem = items.length
    ? Math.max(4, Math.floor((durationInFrames * 0.8 - firstItemFrame) / items.length))
    : 0;

  return (
    <AbsoluteFill style={{ background, alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ opacity: fadeOut, maxWidth: "76%" }}>
        <h1 style={{
          color: "#f2ede3", fontSize: 62, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
          margin: "0 0 44px", opacity: headEnter, transform: `translateY(${interpolate(headEnter, [0, 1], [24, 0])}px)`,
        }}>
          {text}
        </h1>
        {items.map((item, i) => {
          const start = firstItemFrame + i * perItem;
          const pop = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 150 } });
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 24, marginTop: i === 0 ? 0 : 26,
              opacity: pop, transform: `translateX(${interpolate(pop, [0, 1], [-40, 0])}px)`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: accent, color: background,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, flexShrink: 0,
              }}>
                ✓
              </div>
              <span style={{ color: "#e8e3d8", fontSize: 42, fontWeight: 600 }}>{item}</span>
            </div>
          );
        })}
      </div>
      {lightLeak ? <LightLeaks accent={accent} /> : null}
      {grain ? <FilmGrain /> : null}
    </AbsoluteFill>
  );
};
