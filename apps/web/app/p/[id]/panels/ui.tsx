// REQ-STB-060 — the shared visual primitives.
//
// These lived at the top of the 1,211-line page.tsx and were reachable only from inside it, which
// is a large part of why every panel had to be built there too. Nothing here knows about the
// database or the project — importing this module is what lets a panel render in a test.
import React from "react";

export const card: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 14 };
export const sub: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--stage)", borderRadius: 9, padding: 12 };
export const btn: React.CSSProperties = { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 7, padding: "6px 12px", color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
export const btnPrimary: React.CSSProperties = { ...btn, background: "var(--accent)", border: "1px solid var(--accent)", color: "#12151b" };
export const input: React.CSSProperties = { background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 9px", color: "var(--ink)", fontSize: 12 };
export const label: React.CSSProperties = { fontSize: 10, letterSpacing: ".1em" };
export const tiny: React.CSSProperties = { background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 5, padding: "2px 6px", color: "var(--ink)", fontSize: 10 };

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <p className="mono muted" style={label}>{title}</p>
        {action && <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>{action}</div>}
      </div>
      {children}
    </section>
  );
}
