"use client";
// REQ-STB-037 (USER 2026-07-25): "controls and flow does not seem intuitive… I need to navigate
// between the screens, scroll up and down… cant control easily the music etc on editor."
//
// One workspace instead of two scrolling pages: a sticky command bar, a shot rail on the left,
// ONE focused shot on the stage, and a right drawer that holds script · music · cast · output.
// Everything is still server-rendered + server actions; this shell only owns layout state
// (focused shot, drawer tab, widths) so a server action re-render never loses your place.
import React, { useEffect, useState } from "react";
import type { Timeline as TimelineModel } from "@avd/stb/timeline";
import { Timeline } from "./Timeline";

export interface RailShot {
  id: string;
  position: number;
  title: string;
  durationS: number;
  status: "planned" | "framed" | "generated";
  thumbAssetId: string | null;
  busy: boolean;
  isAnimation: boolean;
}

export type DrawerTab = "script" | "music" | "cast" | "output";

const TAB_LABELS: Record<DrawerTab, string> = {
  script: "Script",
  music: "Music",
  cast: "Cast",
  output: "Output",
};

const STATUS_COLOR: Record<RailShot["status"], string> = {
  generated: "var(--ok)",
  framed: "var(--accent)",
  planned: "var(--ink-2)",
};

export function Workspace({
  projectId,
  shots,
  commandBar,
  stagePanels,
  filmPanel,
  addShotPanel,
  railFooter,
  drawerPanels,
  drawerBadges,
  timeline,
}: {
  projectId: string;
  shots: RailShot[];
  commandBar: React.ReactNode;
  /** One node per shot id — only the focused one is mounted visible. */
  stagePanels: Record<string, React.ReactNode>;
  /** The finished film: exports player + animatic. Shown when focus is "film". */
  filmPanel: React.ReactNode;
  addShotPanel: React.ReactNode;
  railFooter?: React.ReactNode;
  drawerPanels: Record<DrawerTab, React.ReactNode>;
  drawerBadges?: Partial<Record<DrawerTab, string>>;
  /** REQ-STB-039: the cut on the track's time axis — clicking a clip focuses it. */
  timeline: TimelineModel;
}) {
  // "film" = the finished cut, "add" = new shot form, otherwise a shot id.
  const [focus, setFocus] = useState<string>(() => shots[0]?.id ?? "film");
  const [tab, setTab] = useState<DrawerTab | null>(null);
  const [wide, setWide] = useState(false);

  // Restore the last place per project so a re-render (or a redirect after export) lands you back.
  useEffect(() => {
    const raw = sessionStorage.getItem(`avd:ws:${projectId}`);
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as { focus?: string; tab?: DrawerTab | null; wide?: boolean };
      if (s.focus) setFocus(s.focus);
      if (s.tab !== undefined) setTab(s.tab);
      if (s.wide !== undefined) setWide(s.wide);
    } catch { /* ignore malformed state */ }
  }, [projectId]);

  useEffect(() => {
    sessionStorage.setItem(`avd:ws:${projectId}`, JSON.stringify({ focus, tab, wide }));
  }, [projectId, focus, tab, wide]);

  // A shot removed by a server action must not leave the stage blank.
  useEffect(() => {
    if (focus === "film" || focus === "add") return;
    if (!shots.some((s) => s.id === focus)) setFocus(shots[0]?.id ?? "film");
  }, [shots, focus]);

  const drawerWidth = tab ? (wide ? 620 : 400) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      <header
        style={{
          flex: "0 0 auto", borderBottom: "1px solid var(--line)", background: "var(--panel)",
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}
      >
        {commandBar}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(Object.keys(TAB_LABELS) as DrawerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(tab === t ? null : t)}
              className="mono"
              aria-pressed={tab === t}
              title={`${TAB_LABELS[t]} panel — edit without leaving the board`}
              style={{
                background: tab === t ? "var(--accent)" : "var(--panel-2)",
                color: tab === t ? "#12151b" : "var(--ink)",
                border: `1px solid ${tab === t ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 7, padding: "5px 11px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {TAB_LABELS[t]}
              {drawerBadges?.[t] && (
                <span
                  className="mono"
                  style={{
                    fontSize: 9, borderRadius: 4, padding: "0 4px",
                    background: tab === t ? "rgba(18,21,27,.18)" : "var(--stage)",
                    color: tab === t ? "#12151b" : "var(--ink-2)",
                  }}
                >
                  {drawerBadges[t]}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {timeline.blocks.length > 0 && (
        <div style={{ flex: "0 0 auto" }}>
          <Timeline
            model={timeline}
            focusedId={focus === "film" || focus === "add" ? null : focus}
            onFocus={setFocus}
            statusById={Object.fromEntries(shots.map((s) => [s.id, s.status]))}
          />
        </div>
      )}

      <div style={{ flex: "1 1 auto", display: "flex", minHeight: 0 }}>
        {/* ── Rail: the whole film at a glance, click to focus ─────────────── */}
        <nav
          style={{
            flex: "0 0 232px", borderRight: "1px solid var(--line)", background: "var(--panel)",
            overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 4,
          }}
        >
          <RailButton
            active={focus === "film"}
            onClick={() => setFocus("film")}
            title="The finished cut — animatic, exports, downloads"
          >
            <span style={{ fontSize: 13 }}>▶</span>
            <span style={{ fontWeight: 600 }}>The film</span>
          </RailButton>

          <p className="mono muted" style={{ fontSize: 9, letterSpacing: ".1em", padding: "10px 8px 4px" }}>
            SHOTS · {shots.length}
          </p>

          {shots.map((s) => (
            <RailButton key={s.id} active={focus === s.id} onClick={() => setFocus(s.id)} title={s.title}>
              <span
                aria-hidden
                title={s.status}
                style={{
                  width: 7, height: 7, borderRadius: "50%", flex: "0 0 auto",
                  background: STATUS_COLOR[s.status],
                }}
              />
              {s.thumbAssetId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/assets/${s.thumbAssetId}?thumb=1`}
                  alt=""
                  style={{ width: 34, height: 20, borderRadius: 3, objectFit: "cover", flex: "0 0 auto", border: "1px solid var(--line)" }}
                />
              ) : (
                <span style={{ width: 34, height: 20, borderRadius: 3, flex: "0 0 auto", border: "1px dashed var(--line)" }} />
              )}
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.position}. {s.title}
                </span>
                <span className="mono muted" style={{ fontSize: 9 }}>
                  {s.durationS}s{s.isAnimation ? " · ✦" : ""}
                  {s.busy ? <span className="gen-pulse"> ● working</span> : ""}
                </span>
              </span>
            </RailButton>
          ))}

          <RailButton active={focus === "add"} onClick={() => setFocus("add")} title="Add a shot">
            <span style={{ fontSize: 13 }}>＋</span>
            <span className="muted">Add shot</span>
          </RailButton>

          {railFooter && <div style={{ marginTop: "auto", paddingTop: 10 }}>{railFooter}</div>}
        </nav>

        {/* ── Stage: exactly one thing at a time ───────────────────────────── */}
        <main style={{ flex: "1 1 auto", overflowY: "auto", padding: "18px 20px", minWidth: 0 }}>
          {focus === "film" ? filmPanel : focus === "add" ? addShotPanel : stagePanels[focus] ?? filmPanel}
        </main>

        {/* ── Drawer: script · music · cast · output, alongside the board ──── */}
        {tab && (
          <aside
            style={{
              flex: `0 0 ${drawerWidth}px`, borderLeft: "1px solid var(--line)", background: "var(--panel)",
              overflowY: "auto", display: "flex", flexDirection: "column",
            }}
          >
            <div
              style={{
                position: "sticky", top: 0, zIndex: 2, background: "var(--panel)",
                borderBottom: "1px solid var(--line)", padding: "9px 12px",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <p className="mono" style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>
                {TAB_LABELS[tab]}
              </p>
              <button
                onClick={() => setWide((w) => !w)}
                className="mono muted"
                title={wide ? "Narrow panel" : "Widen panel"}
                style={{ marginLeft: "auto", background: "none", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-2)", fontSize: 10, padding: "2px 7px", cursor: "pointer" }}
              >
                {wide ? "›› narrow" : "‹‹ wide"}
              </button>
              <button
                onClick={() => setTab(null)}
                className="mono muted"
                title="Close panel"
                style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-2)", fontSize: 10, padding: "2px 7px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 12 }}>{drawerPanels[tab]}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

function RailButton({
  active, onClick, title, children,
}: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-current={active}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
        background: active ? "var(--panel-2)" : "transparent",
        border: `1px solid ${active ? "var(--accent)" : "transparent"}`,
        borderRadius: 8, padding: "6px 8px", color: "var(--ink)", cursor: "pointer",
        font: "inherit", fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}
