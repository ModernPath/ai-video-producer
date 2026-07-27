import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCoalescer } from "../lib/coalesce";

// USER 2026-07-27: "fiber.reset is not a function", plus "Cannot read properties of null (reading
// 'removeChild')" — both thrown from react-dom after submitting a form.
//
// `LiveRefresh` called `router.refresh()` on EVERY SSE "changed" event, and a server action's own
// `revalidatePath` write emits one. So the refresh tore down and replaced the tree at the exact
// moment React ran `recursivelyResetForms` over the form that had just been submitted: the fiber
// it wanted to reset was no longer the form (`fiber.reset` undefined), and the node it wanted to
// remove had already been detached (`removeChild` of null).
//
// Coalescing the refresh means the action's commit finishes first, and a burst of writes — a
// generation moving queued → running → succeeded — costs one refresh instead of three.
describe("REQ-GEN-029: SSE refreshes are coalesced instead of fired per event", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not fire synchronously with the event that triggered it", () => {
    const fn = vi.fn();
    createCoalescer(fn, 300)();
    expect(fn).not.toHaveBeenCalled();
  });

  it("fires once after the quiet period", () => {
    const fn = vi.fn();
    createCoalescer(fn, 300)();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("collapses a burst into a single refresh", () => {
    const fn = vi.fn();
    const hit = createCoalescer(fn, 300);
    for (let i = 0; i < 12; i++) { hit(); vi.advanceTimersByTime(20); }
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("still fires again for a change that arrives after things settle", () => {
    const fn = vi.fn();
    const hit = createCoalescer(fn, 300);
    hit(); vi.advanceTimersByTime(300);
    hit(); vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("cancels a pending refresh on teardown, so an unmounted view never refreshes", () => {
    const fn = vi.fn();
    const hit = createCoalescer(fn, 300);
    hit();
    hit.cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });
});
