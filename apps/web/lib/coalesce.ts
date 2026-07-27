// REQ-GEN-029 — collapse a burst of change events into one call, on a trailing edge.
//
// The SSE stream emits a "changed" event per database write, and `LiveRefresh` turned each one
// into `router.refresh()`. A server action's own `revalidatePath` produces such an event, so the
// refresh raced the action's commit and React threw from `recursivelyResetForms` (`fiber.reset is
// not a function`) and from removing an already-detached node. Waiting for a quiet period lets the
// action finish committing first, and turns a generation's queued → running → succeeded burst into
// a single re-render.
export interface Coalescer {
  (): void;
  /** Drop any pending call — for component teardown, so an unmounted view never refreshes. */
  cancel(): void;
}

export function createCoalescer(fn: () => void, waitMs: number): Coalescer {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const hit = (() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(); }, waitMs);
  }) as Coalescer;
  hit.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return hit;
}
