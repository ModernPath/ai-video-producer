// REQ-PLT-002 — the sign-in gate and the public-path list, tested as pure decisions (CLAUDE.md §6B).
//
// These two functions are the whole security boundary of the deployment: one decides who Google may
// let in, the other decides what is reachable without a session. Both are total functions over
// strings, so they belong in the pure layer where the adversarial cases can actually be enumerated —
// not discovered against a live OAuth round-trip.
import { describe, expect, it } from "vitest";
import { isAllowedSignIn, isPublicPath } from "../src/access";

const DOMAIN = "modernpath.ai";

describe("REQ-PLT-002: Google sign-in is restricted to the workspace domain", () => {
  it("admits a verified address in the domain", () => {
    expect(isAllowedSignIn({ email: "pasi@modernpath.ai", emailVerified: true }, DOMAIN)).toBe(true);
  });

  it("admits it regardless of case — Google may return either", () => {
    expect(isAllowedSignIn({ email: "Pasi@ModernPath.AI", emailVerified: true }, DOMAIN)).toBe(true);
  });

  it("rejects another domain", () => {
    expect(isAllowedSignIn({ email: "someone@gmail.com", emailVerified: true }, DOMAIN)).toBe(false);
  });

  it("rejects an UNVERIFIED address in the domain", () => {
    // A consumer Google account can claim any address until Google has verified it. Without this
    // check the `hd` hint is the only barrier, and `hd` is a UI hint the client can drop.
    expect(isAllowedSignIn({ email: "pasi@modernpath.ai", emailVerified: false }, DOMAIN)).toBe(false);
  });

  it("rejects a domain that merely ENDS WITH ours", () => {
    expect(isAllowedSignIn({ email: "attacker@evil-modernpath.ai", emailVerified: true }, DOMAIN)).toBe(false);
  });

  it("rejects a SUBDOMAIN of ours", () => {
    expect(isAllowedSignIn({ email: "attacker@mail.modernpath.ai", emailVerified: true }, DOMAIN)).toBe(false);
  });

  it("rejects our domain used as a prefix of a longer one", () => {
    expect(isAllowedSignIn({ email: "attacker@modernpath.ai.evil.com", emailVerified: true }, DOMAIN)).toBe(false);
  });

  it("rejects an address whose local part contains our domain", () => {
    expect(isAllowedSignIn({ email: "pasi@modernpath.ai@evil.com", emailVerified: true }, DOMAIN)).toBe(false);
  });

  it("rejects a missing or malformed address", () => {
    expect(isAllowedSignIn({ email: null, emailVerified: true }, DOMAIN)).toBe(false);
    expect(isAllowedSignIn({ email: "", emailVerified: true }, DOMAIN)).toBe(false);
    expect(isAllowedSignIn({ email: "modernpath.ai", emailVerified: true }, DOMAIN)).toBe(false);
    expect(isAllowedSignIn({ email: "  pasi@modernpath.ai  ", emailVerified: true }, DOMAIN)).toBe(true);
  });
});

describe("REQ-PLT-002: only the deliberate exceptions are reachable without a session", () => {
  it("leaves the share-link path public — it authenticates by token instead (ADR-005, INV-ASM-005)", () => {
    expect(isPublicPath("/s/AbC123")).toBe(true);
  });

  it("leaves the auth routes and the sign-in screen public", () => {
    expect(isPublicPath("/api/auth/signin")).toBe(true);
    expect(isPublicPath("/api/auth/callback/google")).toBe(true);
    expect(isPublicPath("/signin")).toBe(true);
  });

  it("leaves the health endpoint public — the proxy probes it with no cookie", () => {
    expect(isPublicPath("/api/health")).toBe(true);
  });

  it("gates the studio, the library, a project and its API routes", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/library")).toBe(false);
    expect(isPublicPath("/p/0198e0c0-0000-7000-8000-000000000000")).toBe(false);
    expect(isPublicPath("/api/projects/abc/events")).toBe(false);
    expect(isPublicPath("/api/assets/abc")).toBe(false);
  });

  it("does not open a gated path that merely STARTS WITH a public segment", () => {
    // `/september` starts with "/s" — a prefix check without the boundary would publish it.
    expect(isPublicPath("/september")).toBe(false);
    expect(isPublicPath("/signin-as-admin")).toBe(false);
    expect(isPublicPath("/api/healthz-internal")).toBe(false);
  });
});
