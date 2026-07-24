// REQ-ANM-003: animated caption overlay — cue-timed lines (from MM:SS transcripts upstream),
// rendered transparent for compositing onto takes/exports (REQ-ANM-002 alpha recipe).
import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface CaptionCue {
  startS: number;
  endS: number;
  text: string;
}

export interface CaptionsProps {
  cues: CaptionCue[];
  accent?: string;
}

const CueLine: React.FC<{ text: string; accent: string; durationFrames: number }> = ({ text, accent, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 170 } });
  const fadeOut = interpolate(frame, [durationFrames - fps / 3, durationFrames - 1], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: "7%" }}>
      <div
        style={{
          opacity: pop * fadeOut,
          transform: `translateY(${(1 - pop) * 24}px)`,
          background: "rgba(10,12,16,0.72)",
          border: `1px solid ${accent}55`,
          borderRadius: 10,
          padding: "0.45em 1em",
          maxWidth: "80%",
          color: "#f2ede3",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 34,
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC<CaptionsProps> = ({ cues, accent = "#e8b04b" }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {(cues ?? []).map((c, i) => {
        const from = Math.round(c.startS * fps);
        const frames = Math.max(1, Math.round((c.endS - c.startS) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={frames}>
            <CueLine text={c.text} accent={accent} durationFrames={frames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
