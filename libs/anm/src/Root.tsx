import React from "react";
import { Composition } from "remotion";
import { TitleCard, type TitleCardProps } from "./TitleCard";

const FPS = 24;

export const Root: React.FC = () => (
  <Composition
    id="TitleCard"
    component={TitleCard}
    fps={FPS}
    width={1280}
    height={720}
    durationInFrames={4 * FPS}
    defaultProps={{ text: "Title" } as TitleCardProps}
    calculateMetadata={({ props }) => {
      const p = props as TitleCardProps & { durationS?: number; aspectRatio?: "16:9" | "9:16" };
      const portrait = p.aspectRatio === "9:16";
      return {
        durationInFrames: Math.round((p.durationS ?? 4) * FPS),
        width: portrait ? 720 : 1280,
        height: portrait ? 1280 : 720,
      };
    }}
  />
);
