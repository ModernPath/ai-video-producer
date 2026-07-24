// REQ-ANM-006: stat/metric punch — the first number in `text` counts up, the rest is its label.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmGrain, LightLeaks } from "./effects";

export interface StatPunchProps {
  text: string;
  subtext?: string;
  accent?: string;
  background?: string;
  lightLeak?: boolean;
  grain?: boolean;
}

export const StatPunch: React.FC<StatPunchProps> = ({
  text,
  subtext,
  accent = "#e8b04b",
  background = "#12151b",
  lightLeak = true,
  grain = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // "4200 deployments shipped" → value 4200, prefix "", suffix "", label "deployments shipped".
  // Keeps non-digit decoration ("+", "%", "x", "€") attached to the number token.
  const m = text.match(/([^\d\s]*)(\d[\d.,]*)([^\s]*)\s*(.*)/);
  const value = m ? Number(m[2]!.replace(/[,.](?=\d{3}\b)/g, "")) : 0;
  const prefix = m?.[1] ?? "";
  const suffix = m?.[3] ?? "";
  const label = m?.[4] ?? text;

  const countEnd = Math.min(Math.round(durationInFrames * 0.55), durationInFrames - fps);
  const progress = interpolate(frame, [0, countEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // ease-out so the last digits settle instead of flickering
  const eased = 1 - (1 - progress) ** 3;
  const shown = Math.round(value * eased);
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.min(24, durationInFrames / 2) });
  const fadeOut = interpolate(frame, [durationInFrames - fps / 2, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background, alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ opacity: enter * fadeOut, textAlign: "center", padding: "0 8%" }}>
        <div style={{ color: accent, fontSize: 230, fontWeight: 900, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {prefix}{shown.toLocaleString("en-US")}{suffix}
        </div>
        {label ? (
          <div style={{ color: "#f2ede3", fontSize: 52, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 28 }}>
            {label}
          </div>
        ) : null}
        {subtext ? <p style={{ color: "#9aa3b2", fontSize: 32, marginTop: 22 }}>{subtext}</p> : null}
      </div>
      {lightLeak ? <LightLeaks accent={accent} /> : null}
      {grain ? <FilmGrain /> : null}
    </AbsoluteFill>
  );
};
