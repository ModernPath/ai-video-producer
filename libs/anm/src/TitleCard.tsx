// REQ-ANM-001: parameterized title-card composition — brand-dark, animated text.
// Templates are fixed React components with props — the AI/user supplies props, never code.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface TitleCardProps {
  text: string;
  subtext?: string;
  accent?: string;
  background?: string;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  text,
  subtext,
  accent = "#e8b04b",
  background = "#12151b",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.min(30, durationInFrames / 2) });
  const rise = interpolate(enter, [0, 1], [40, 0]);
  const underline = interpolate(enter, [0, 1], [0, 1]);
  const fadeOut = interpolate(frame, [durationInFrames - fps / 2, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background, alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ opacity: enter * fadeOut, transform: `translateY(${rise}px)`, textAlign: "center", padding: "0 8%" }}>
        <h1 style={{ color: "#f2ede3", fontSize: 92, letterSpacing: "0.06em", margin: 0, fontWeight: 800, textTransform: "uppercase" }}>
          {text}
        </h1>
        <div style={{ height: 6, width: `${underline * 34}%`, background: accent, margin: "28px auto 0", borderRadius: 3 }} />
        {subtext ? (
          <p style={{ color: "#9aa3b2", fontSize: 34, marginTop: 30, letterSpacing: "0.02em" }}>{subtext}</p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
