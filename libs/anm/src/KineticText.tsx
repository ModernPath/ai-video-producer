// REQ-ANM-004: kinetic typography — sequential word pops via transform composition
// (remotion.dev/docs/transforms, @remotion/animation-utils makeTransform).
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { makeTransform, rotate, scale, translateY } from "@remotion/animation-utils";
import { FilmGrain, LightLeaks } from "./effects";

export interface KineticTextProps {
  text: string;
  accent?: string;
  background?: string;
  lightLeak?: boolean;
  grain?: boolean;
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  accent = "#e8b04b",
  background = "#12151b",
  lightLeak = true,
  grain = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  // Eval finding (hype-countdown): short text must PUNCH — scale up as content shrinks.
  const totalChars = words.join("").length;
  const fontSize = totalChars <= 2 ? 420 : totalChars <= 6 ? 220 : totalChars <= 14 ? 130 : 84;
  const perWord = Math.max(6, Math.floor((durationInFrames * 0.6) / Math.max(words.length, 1)));
  const fadeOut = interpolate(frame, [durationInFrames - fps / 2, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background, alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      {/* fontSize lives on the container so gap's em unit tracks the glyphs — a 16px-default
          container made 0.6em ≈ 10px and words visually fused ("WAKETHECITY", 2026-07-24 run) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35em", justifyContent: "center", padding: "0 7%", opacity: fadeOut, fontSize }}>
        {words.map((w, i) => {
          const start = i * perWord;
          const pop = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 160 } });
          const transform = makeTransform([
            translateY(interpolate(pop, [0, 1], [60, 0])),
            scale(interpolate(pop, [0, 1], [0.6, 1])),
            rotate(interpolate(pop, [0, 1], [i % 2 === 0 ? -8 : 8, 0])),
          ]);
          return (
            <span key={i} style={{
              display: "inline-block", transform, opacity: pop,
              color: i % 3 === 2 ? accent : "#f2ede3",
              fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {w}
            </span>
          );
        })}
      </div>
      {lightLeak ? <LightLeaks accent={accent} /> : null}
      {grain ? <FilmGrain /> : null}
    </AbsoluteFill>
  );
};
