// REQ-STB-061 — a StagePanel's props, with no database anywhere near them.
//
// `docs/88-architecture-review.md` §4b: `apps/web` had one test, a source-text assertion, and three
// of the defects the user reported were pure UI state. None was reachable without rendering, and
// rendering was impossible while the panel lived inside an async server component. This fixture is
// what makes it possible — the shape the page computes, as plain values.
//
// Deliberately minimal: a shot with nothing generated yet. Each test overrides only the field its
// defect turned on, so a failure names the cause rather than the fixture.
import type { StagePanelProps } from "../../app/p/[id]/panels/StagePanel";

type Shot = StagePanelProps["shot"];

export const aShot = (over: Partial<Shot> = {}): Shot =>
  ({
    id: "shot-1",
    organizationId: "org-1",
    projectId: "proj-1",
    position: 1,
    title: "Two men, one table",
    direction: { synopsis: "s", subject: "x", action: "y" },
    durationS: "6",
    imagePrompt: null,
    videoPrompt: null,
    dialogue: null,
    refAssetIds: null,
    selectedStartFrameId: null,
    selectedTakeId: null,
    continuesFromShotId: null,
    animation: null,
    audioMixMode: null,
    createdAt: new Date("2026-07-27T00:00:00Z"),
    deletedAt: null,
    ...over,
  }) as Shot;

export const stagePanelProps = (over: Partial<StagePanelProps> = {}): StagePanelProps => {
  const shot = over.shot ?? aShot();
  return {
    shot,
    index: 0,
    projectId: "proj-1",
    shotCount: 3,
    cost: 0,
    dd: { synopsis: "s", subject: "x", action: "y" },
    cands: { frames: [], takes: [] } as unknown as StagePanelProps["cands"],
    busy: { frame: 0, take: 0 },
    status: "empty" as StagePanelProps["status"],
    selectedTake: undefined,
    selFrame: undefined,
    autoImage: "auto image prompt",
    autoVideo: "auto video prompt",
    castRefs: [],
    effectiveRefs: [],
    chain: { headId: shot.id, members: [shot.id], isHead: true } as unknown as StagePanelProps["chain"],
    handoff: "none" as StagePanelProps["handoff"],
    blocked: null as StagePanelProps["blocked"],
    est: { effectiveSeconds: 6, clips: 1, usd: 0.6 } as unknown as StagePanelProps["est"],
    estDiffers: false,
    cast: [],
    music: null as StagePanelProps["music"],
    sync: null,
    shotLabels: new Map([[shot.id, "1"]]),
    takeCondFrame: new Map(),
    shots: [shot],
    activeByShot: new Map(),
    activeRowsByShot: new Map(),
    failedByShot: new Map(),
    timeline: { blocks: [], boundaries: [], totalS: 6 } as unknown as StagePanelProps["timeline"],
    timelineByShot: new Map(),
    audioMixMode: null,
    ...over,
  };
};
