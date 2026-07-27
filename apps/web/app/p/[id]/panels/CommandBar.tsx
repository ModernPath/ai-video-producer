// REQ-STB-060 — the top bar: progress, spend, and the global actions.
//
// Moved out of page.tsx VERBATIM. The props are destructured in the signature precisely so the
// JSX below needed no rewriting — extracting StagePanel by prefixing identifiers corrupted seven
// pieces of user-visible text ('use whole cast' became 'use whole props.cast').
import Link from "next/link";
import React from "react";
import { project } from "@avd/prj/schema";
import type { RailShot } from "../../../../components/Workspace";
import {
  exportAction,
} from "../../../actions";
import { AnimaticPlayer } from "../../../../components/AnimaticPlayer";
import { LiveRefresh } from "../../../../components/LiveRefresh";
import { SubmitButton } from "../../../../components/SubmitButton";
import { boardProgress } from "@avd/stb/board";
import { config, priceTable, styleCards } from "@avd/shared/config";
import { getMusicBrief, listShots } from "@avd/stb";
import { input, label } from "./ui";

export interface CommandBarProps {
  /** The project row. Named `p` because that is what it is called in the JSX moved from page.tsx. */
  p: typeof project.$inferSelect;
  activeKinds: Set<string>;
  captionSelect: React.ReactNode;
  cost: number;
  id: string;
  kindLabel: Record<string, string>;
  music: Awaited<ReturnType<typeof getMusicBrief>>;
  progress: ReturnType<typeof boardProgress>;
  railShots: RailShot[];
  shots: Awaited<ReturnType<typeof listShots>>;
  spentToday: number;
}

export function CommandBar({ p, activeKinds, captionSelect, cost, id, kindLabel, music, progress, railShots, shots, spentToday }: CommandBarProps) {
  return (
    <>
      <Link href="/" className="mono muted" style={{ fontSize: 11 }} title="All projects">←</Link>
      <div style={{ minWidth: 0 }}>
        <h1 className="disp" style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{p.title}</h1>
        <p className="mono muted" style={{ fontSize: 9.5 }}>
          {p.aspectRatio} · {p.targetDurationS}s · {progress.generated}/{progress.total} generated · route {config.gen.videoRoute}
        </p>
      </div>
      <span className="mono" style={{ fontSize: 11 }} title="This project's spend · today's org-wide spend vs the daily cap (INV-GEN-004)">
        <b>${Number(cost).toFixed(2)}</b>
        <span className="muted"> · today ${spentToday.toFixed(2)}/${config.gen.quota.dailyUsdPerOrg.toFixed(0)}</span>
      </span>
      <LiveRefresh projectId={id} />
      {activeKinds.size > 0 && (
        <span className="mono gen-pulse" style={{ fontSize: 10 }}>
          ● {[...activeKinds].map((k) => kindLabel[k] ?? k).join(" + ")}…
        </span>
      )}
      <AnimaticPlayer
        shots={railShots.map((s) => ({ id: s.id, durationS: s.durationS, frameAssetId: s.thumbAssetId, title: `${s.label}. ${s.title}` }))}
        musicAssetId={music?.activeTrackAssetId}
      />
      <form action={exportAction} style={{ display: "flex", gap: 5, alignItems: "center" }} title={progress.ready ? "Export the full cut" : "Takeless shots are skipped explicitly (INV-ASM-002)"}>
        <input type="hidden" name="projectId" value={id} />
        {!progress.ready && <input type="hidden" name="excludeShotIds" value={progress.pending.join(",")} />}
        {captionSelect}
        <SubmitButton primary disabled={progress.generated === 0} pendingLabel="Exporting…">
          {progress.ready ? "Export cut" : `Export ${progress.generated} · skip ${progress.total - progress.generated}`}
        </SubmitButton>
      </form>
    </>
  );
}
