import React from "react";
import { Composition } from "remotion";
import { Captions, type CaptionsProps } from "./Captions";
import { Checklist, type ChecklistProps } from "./Checklist";
import { QuoteCard, type QuoteCardProps } from "./QuoteCard";
import { StatPunch, type StatPunchProps } from "./StatPunch";
import { KineticText, type KineticTextProps } from "./KineticText";
import { LowerThird, type LowerThirdProps } from "./LowerThird";
import { TitleCard, type TitleCardProps } from "./TitleCard";

const FPS = 24;

export const Root: React.FC = () => (
  <>
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
    <Composition
      id="LowerThird"
      component={LowerThird}
      fps={24}
      width={1280}
      height={720}
      durationInFrames={4 * 24}
      defaultProps={{ text: "Lower third" } as LowerThirdProps}
      calculateMetadata={({ props }) => {
        const p = props as LowerThirdProps & { durationS?: number; aspectRatio?: "16:9" | "9:16" };
        const portrait = p.aspectRatio === "9:16";
        return {
          durationInFrames: Math.round((p.durationS ?? 4) * 24),
          width: portrait ? 720 : 1280,
          height: portrait ? 1280 : 720,
        };
      }}
    />
    <Composition
      id="KineticText"
      component={KineticText}
      fps={24}
      width={1280}
      height={720}
      durationInFrames={4 * 24}
      defaultProps={{ text: "Kinetic words" } as KineticTextProps}
      calculateMetadata={({ props }) => {
        const p = props as KineticTextProps & { durationS?: number; aspectRatio?: "16:9" | "9:16" };
        const portrait = p.aspectRatio === "9:16";
        return {
          durationInFrames: Math.round((p.durationS ?? 4) * 24),
          width: portrait ? 720 : 1280,
          height: portrait ? 1280 : 720,
        };
      }}
    />
    {/* REQ-ANM-006: template variety — stat, quote, checklist */}
    <Composition
      id="StatPunch"
      component={StatPunch}
      fps={24}
      width={1280}
      height={720}
      durationInFrames={4 * 24}
      defaultProps={{ text: "100 things" } as StatPunchProps}
      calculateMetadata={({ props }) => {
        const p = props as StatPunchProps & { durationS?: number; aspectRatio?: "16:9" | "9:16" };
        const portrait = p.aspectRatio === "9:16";
        return {
          durationInFrames: Math.round((p.durationS ?? 4) * 24),
          width: portrait ? 720 : 1280,
          height: portrait ? 1280 : 720,
        };
      }}
    />
    <Composition
      id="QuoteCard"
      component={QuoteCard}
      fps={24}
      width={1280}
      height={720}
      durationInFrames={4 * 24}
      defaultProps={{ text: "Quote" } as QuoteCardProps}
      calculateMetadata={({ props }) => {
        const p = props as QuoteCardProps & { durationS?: number; aspectRatio?: "16:9" | "9:16" };
        const portrait = p.aspectRatio === "9:16";
        return {
          durationInFrames: Math.round((p.durationS ?? 4) * 24),
          width: portrait ? 720 : 1280,
          height: portrait ? 1280 : 720,
        };
      }}
    />
    <Composition
      id="Checklist"
      component={Checklist}
      fps={24}
      width={1280}
      height={720}
      durationInFrames={4 * 24}
      defaultProps={{ text: "Checklist" } as ChecklistProps}
      calculateMetadata={({ props }) => {
        const p = props as ChecklistProps & { durationS?: number; aspectRatio?: "16:9" | "9:16" };
        const portrait = p.aspectRatio === "9:16";
        return {
          durationInFrames: Math.round((p.durationS ?? 4) * 24),
          width: portrait ? 720 : 1280,
          height: portrait ? 1280 : 720,
        };
      }}
    />
    <Composition
      id="Captions"
      component={Captions}
      fps={24}
      width={1280}
      height={720}
      durationInFrames={4 * 24}
      defaultProps={{ cues: [] } as CaptionsProps}
      calculateMetadata={({ props }) => {
        const p = props as CaptionsProps & { durationS?: number; aspectRatio?: "16:9" | "9:16" };
        const portrait = p.aspectRatio === "9:16";
        return {
          durationInFrames: Math.round((p.durationS ?? 4) * 24),
          width: portrait ? 720 : 1280,
          height: portrait ? 1280 : 720,
        };
      }}
    />
  </>
);
