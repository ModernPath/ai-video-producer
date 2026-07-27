// REQ-STB-060 — the cast drawer.
//
// Moved out of page.tsx VERBATIM. The props are destructured in the signature precisely so the
// JSX below needed no rewriting — extracting StagePanel by prefixing identifiers corrupted seven
// pieces of user-visible text ('use whole cast' became 'use whole props.cast').
import React from "react";
import { CastBar } from "../../../../components/CastBar";
import { listEntities, listProjectEntities, listStyleKits } from "@avd/ast";

export interface CastPanelProps {
  castIds: Set<string>;
  id: string;
  orgEntities: Awaited<ReturnType<typeof listEntities>>;
}

export function CastPanel({ castIds, id, orgEntities }: CastPanelProps) {
  return (
    <>
      <CastBar
        projectId={id}
        entities={orgEntities.map((e) => ({ id: e.id, kind: e.kind, name: e.name, refAssetIds: e.refAssetIds, hasProfile: Boolean(e.profile) }))}
        castIds={castIds}
        note="checked members (and their profiles) feed every prompt"
      />
      <p className="mono muted" style={{ fontSize: 9.5, marginTop: 10 }}>
        Per-shot reference overrides live on each shot, under its prompts.
      </p>
    </>
  );
}
