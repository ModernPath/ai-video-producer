// REQ-ASM-007 / INV-ASM-005 — share links grant access ONLY to the linked export's
// output: token-scoped, revocable, optional expiry. ASM single-writer of asm.share_link.
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { AsmValidationError } from "./service";
import { exportJob, shareLink } from "./schema";

export interface ShareLink {
  id: string;
  exportJobId: string;
  token: string;
  expiresAt: Date | null;
}

/** Create a share link for a SUCCEEDED export only (INV-ASM-005: only finished outputs are shareable). */
export async function createShareLink(
  db: Db,
  input: { exportJobId: string; expiresAt?: Date | null }
): Promise<ShareLink> {
  const [job] = await db.select().from(exportJob).where(eq(exportJob.id, input.exportJobId));
  if (!job || job.status !== "succeeded" || !job.outputAssetId) {
    // INV-ASM-005: a link may only ever point at a completed export's output
    throw new AsmValidationError("conflict", "Share links require a succeeded export");
  }
  const token = randomBytes(config.asm.share.tokenBytes).toString("base64url"); // url-safe, 32+ chars
  const id = uuidv7();
  const expiresAt = input.expiresAt ?? null;
  await db.insert(shareLink).values({ id, exportJobId: input.exportJobId, token, expiresAt });
  return { id, exportJobId: input.exportJobId, token, expiresAt };
}

/** Revoke a share link; resolving its token yields null from then on (INV-ASM-005 revocable). */
export async function revokeShareLink(db: Db, input: { shareLinkId: string }): Promise<void> {
  const [link] = await db.select().from(shareLink).where(eq(shareLink.id, input.shareLinkId));
  if (!link) throw new AsmValidationError("not_found", "Share link not found");
  if (!link.revokedAt) {
    await db.update(shareLink).set({ revokedAt: new Date() }).where(eq(shareLink.id, input.shareLinkId));
  }
}

export interface ResolvedShare {
  exportJob: typeof exportJob.$inferSelect;
  outputAssetId: string;
}

/** Resolve a token to its export's output — null for unknown, revoked, or expired tokens. */
export async function resolveShareToken(db: Db, token: string): Promise<ResolvedShare | null> {
  const [link] = await db.select().from(shareLink).where(eq(shareLink.token, token));
  if (!link) return null;
  if (link.revokedAt) return null; // INV-ASM-005: revocation cuts access
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return null; // optional expiry
  const [job] = await db.select().from(exportJob).where(eq(exportJob.id, link.exportJobId));
  if (!job?.outputAssetId) return null;
  return { exportJob: job, outputAssetId: job.outputAssetId }; // token-scoped: only this export's output
}
