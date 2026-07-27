// REQ-STB-060 — adding a shot by hand.
//
// Moved out of page.tsx VERBATIM. The props are destructured in the signature precisely so the
// JSX below needed no rewriting — extracting StagePanel by prefixing identifiers corrupted seven
// pieces of user-visible text ('use whole cast' became 'use whole props.cast').
import React from "react";
import {
  createShotAction,
} from "../../../actions";
import { SubmitButton } from "../../../../components/SubmitButton";
import { card, input } from "./ui";
import { config, priceTable, styleCards } from "@avd/shared/config";

export interface AddShotPanelProps {
  id: string;
}

export function AddShotPanel({ id }: AddShotPanelProps) {
  return (
    <div style={{ maxWidth: 620 }}>
      <h2 className="disp" style={{ fontSize: 15, marginBottom: 10 }}>Add a shot</h2>
      <form action={createShotAction} style={{ ...card, display: "grid", gap: 8 }}>
        <input type="hidden" name="projectId" value={id} />
        <input name="title" placeholder="Shot title" required style={input} />
        <input name="synopsis" placeholder="What happens (synopsis)" style={input} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="subject" placeholder="Subject" style={{ ...input, flex: "1 1 140px" }} />
          <input name="action" placeholder="Action" style={{ ...input, flex: "1 1 140px" }} />
          <input name="durationS" type="number" step="0.5" min={config.shot.minSeconds} max={config.shot.maxSeconds} defaultValue={config.shot.defaultSeconds} title="Duration in seconds" style={{ ...input, width: 84 }} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SubmitButton primary pendingLabel="Adding…">Add shot</SubmitButton>
          <span className="mono muted" style={{ fontSize: 9.5 }}>appends to the end — reorder with ↑↓ on the shot</span>
        </div>
      </form>
    </div>
  );
}
