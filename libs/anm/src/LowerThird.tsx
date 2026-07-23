// REQ-ANM-002: transparent lower-third overlay — composited onto generated takes.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface LowerThirdProps {
  text: string;
  accent?: string;
}

export const LowerThird: React.FC<LowerThirdProps> = ({ text, accent = "#e8b04b" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.min(20, durationInFrames / 3) });
  const slide = interpolate(enter, [0, 1], [-320, 0]);
  const fadeOut = interpolate(frame, [durationInFrames - fps / 2, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", justifyContent: "flex-end", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ margin: "0 0 64px 64px", opacity: fadeOut, transform: `translateX(${slide}px)`, display: "inline-flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 8, height: 56, background: accent, borderRadius: 4 }} />
        <span style={{ color: "#fff", fontSize: 40, fontWeight: 700, textShadow: "0 2px 12px rgba(0,0,0,.65)", letterSpacing: "0.03em" }}>
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
