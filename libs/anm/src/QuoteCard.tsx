// REQ-ANM-006: quote/testimonial card — serif quote with an oversized mark, author from subtext.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmGrain, LightLeaks } from "./effects";

export interface QuoteCardProps {
  text: string;
  subtext?: string;
  accent?: string;
  background?: string;
  lightLeak?: boolean;
  grain?: boolean;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  text,
  subtext,
  accent = "#e8b04b",
  background = "#12151b",
  lightLeak = true,
  grain = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.min(30, durationInFrames / 2) });
  const authorEnter = spring({ frame: frame - Math.round(fps * 0.7), fps, config: { damping: 200 } });
  const fadeOut = interpolate(frame, [durationInFrames - fps / 2, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fontSize = text.length <= 60 ? 64 : text.length <= 120 ? 52 : 42;

  return (
    <AbsoluteFill style={{ background, alignItems: "center", justifyContent: "center", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div style={{ opacity: fadeOut, maxWidth: "78%", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", top: -110, left: -30, color: accent, fontSize: 260, opacity: 0.35 * enter, lineHeight: 1, fontFamily: "Georgia, serif" }}>
          “
        </div>
        <p style={{
          color: "#f2ede3", fontSize, lineHeight: 1.35, fontStyle: "italic", margin: 0,
          opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        }}>
          {text}
        </p>
        {subtext ? (
          <p style={{
            color: accent, fontSize: 30, marginTop: 34, fontFamily: "Helvetica, Arial, sans-serif",
            textTransform: "uppercase", letterSpacing: "0.14em", fontStyle: "normal",
            opacity: authorEnter, transform: `translateY(${interpolate(authorEnter, [0, 1], [16, 0])}px)`,
          }}>
            — {subtext}
          </p>
        ) : null}
      </div>
      {lightLeak ? <LightLeaks accent={accent} /> : null}
      {grain ? <FilmGrain /> : null}
    </AbsoluteFill>
  );
};
