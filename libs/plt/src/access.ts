/**
 * REQ-PLT-002 — who may sign in, and what is reachable without signing in.
 *
 * ADR-005 chose Auth.js session cookies and noted it was "not yet implemented"; this is the
 * implementation, deliberately kept as two pure predicates so the adversarial cases are enumerable
 * (see `tests/access.spec.ts`) rather than discovered against a live OAuth round-trip.
 */
import { config } from "@avd/shared/config";

/** The Google profile fields the gate needs. `emailVerified` is Google's `email_verified` claim. */
export interface SignInIdentity {
  email: string | null | undefined;
  emailVerified: boolean | null | undefined;
}

/**
 * True only for a Google-VERIFIED address whose domain is exactly `allowedDomain`.
 *
 * The `hd` authorization parameter is a hint the client can drop, so it is never the gate. The
 * domain is compared after the LAST `@` — `pasi@modernpath.ai@evil.com` is a real address shape
 * and a suffix check would admit it.
 */
export function isAllowedSignIn(
  identity: SignInIdentity,
  allowedDomain: string = config.platform.allowedEmailDomain
): boolean {
  if (!identity.emailVerified) return false; // BR-PLT-003
  const email = identity.email?.trim().toLowerCase();
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return false;
  if (email.slice(0, at).includes("@")) return false; // no second @ hiding a domain in the local part
  return email.slice(at + 1) === allowedDomain.trim().toLowerCase();
}

/**
 * Paths served without a session. Everything not listed here is gated — the default is closed, so
 * a new route is protected the moment it exists rather than the moment someone remembers.
 *
 * `/s/…` is the share-link path: it authenticates by token instead of by cookie (ADR-005,
 * INV-ASM-005), which is exactly why it must stay reachable.
 */
const PUBLIC_PREFIXES = ["/s", "/api/auth", "/signin", "/api/health"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
