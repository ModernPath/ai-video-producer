import { describe, expect, it } from "vitest";
import { parseRequestedDurationS } from "../src/brief-duration";

// USER 2026-07-26: "it's only 30seconds instead of minute that I was asking for." The prompt said
// "1-minute feature film", but nothing ever read a duration out of it — the project kept the 30s
// default it was created with, and every downstream target followed that.
describe("REQ-PRJ-006: reading the runtime the user asked for out of their own prompt", () => {
  it("reads the case that started this — a hyphenated minute", () => {
    expect(parseRequestedDurationS("1-minute feature film of ModernPath AI directed by Aki Kaurismäki")).toBe(60);
  });

  it("reads plain minutes", () => {
    expect(parseRequestedDurationS("a 2 minute brand film")).toBe(120);
    expect(parseRequestedDurationS("make it one minute long")).toBe(60);
    expect(parseRequestedDurationS("two minutes of slow atmosphere")).toBe(120);
  });

  it("reads seconds in every spelling a person actually types", () => {
    expect(parseRequestedDurationS("a 30 second film")).toBe(30);
    expect(parseRequestedDurationS("30s teaser")).toBe(30);
    expect(parseRequestedDurationS("45-second product launch")).toBe(45);
    expect(parseRequestedDurationS("90 secs of hype")).toBe(90);
  });

  it("reads a minute-and-seconds runtime", () => {
    expect(parseRequestedDurationS("a 1:30 music video")).toBe(90);
    expect(parseRequestedDurationS("2:05 short")).toBe(125);
  });

  it("returns null when the prompt says nothing about length", () => {
    expect(parseRequestedDurationS("a moody film about a coffee grinder")).toBeNull();
    expect(parseRequestedDurationS("")).toBeNull();
  });

  it("ignores numbers that are plainly not a runtime", () => {
    expect(parseRequestedDurationS("a film about the 1980s")).toBeNull();
    expect(parseRequestedDurationS("featuring 3 dancers")).toBeNull();
    expect(parseRequestedDurationS("shot on 16mm")).toBeNull();
  });

  it("refuses a runtime outside what the product can build, rather than guessing", () => {
    expect(parseRequestedDurationS("a 3 hour epic")).toBeNull();
    expect(parseRequestedDurationS("a 20 minute documentary")).toBeNull(); // beyond the cap
    expect(parseRequestedDurationS("a 2 second flash")).toBeNull();        // below one shot
  });

  it("takes the first runtime when a prompt mentions several", () => {
    expect(parseRequestedDurationS("a 1-minute film, cut down from a 3 minute version")).toBe(60);
  });
});
