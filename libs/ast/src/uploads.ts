// REQ-AST-004 / INV-AST-005 — validated uploads. One validation core, two paths:
// presigned PUT sessions (prod/browser) and direct server-side bytes (dev/simple).
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { asset, uploadSession } from "./schema";
import { assetKey, bucketName, putObject } from "./storage";

export class AstValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const SESSION_TTL_MS = 10 * 60 * 1000;

function limitsFor(kind: "image" | "audio") {
  return kind === "image"
    ? { mimes: config.upload.imageMimes as readonly string[], maxBytes: config.upload.maxImageBytes }
    : { mimes: config.upload.audioMimes as readonly string[], maxBytes: config.upload.maxAudioBytes };
}

export function validateUpload(kind: "image" | "audio", mime: string, bytes: number): void {
  const { mimes, maxBytes } = limitsFor(kind);
  if (!mimes.includes(mime)) {
    throw new AstValidationError("validation_failed", `Unsupported ${kind} type "${mime}" — allowed: ${mimes.join(", ")}`);
  }
  if (bytes <= 0 || bytes > maxBytes) {
    throw new AstValidationError("validation_failed", `File size ${bytes} exceeds the ${Math.round(maxBytes / 1024 / 1024)}MB ${kind} limit`);
  }
}

function s3ForSigning(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9100",
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "avd",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "avd-secret",
    },
  });
}

export interface UploadSessionResult {
  sessionId: string;
  url: string;
  storageKey: string;
}

export async function createUploadSession(
  db: Db,
  input: { organizationId: string; projectId: string | null; kind: "image" | "audio"; mime: string; declaredBytes: number }
): Promise<UploadSessionResult> {
  validateUpload(input.kind, input.mime, input.declaredBytes); // INV-AST-005: before any storage touch
  const sessionId = uuidv7();
  const ext = input.mime.split("/")[1] ?? "bin";
  const storageKey = assetKey(input.organizationId, input.projectId, sessionId, ext);
  const url = await getSignedUrl(
    s3ForSigning(),
    new PutObjectCommand({ Bucket: bucketName(), Key: storageKey, ContentType: input.mime }),
    { expiresIn: SESSION_TTL_MS / 1000 }
  );
  await db.insert(uploadSession).values({
    id: sessionId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    kind: input.kind,
    mime: input.mime,
    declaredBytes: input.declaredBytes,
    storageKey,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return { sessionId, url, storageKey };
}

export async function completeUpload(db: Db, sessionId: string): Promise<string> {
  const [session] = await db.select().from(uploadSession).where(eq(uploadSession.id, sessionId));
  if (!session || session.status !== "pending") throw new AstValidationError("not_found", "Upload session not found or already completed");
  const head = await s3ForSigning().send(new HeadObjectCommand({ Bucket: bucketName(), Key: session.storageKey }))
    .catch(() => { throw new AstValidationError("validation_failed", "No object was uploaded for this session"); });
  const size = head.ContentLength ?? 0;
  validateUpload(session.kind as "image" | "audio", session.mime, size);

  const assetId = uuidv7();
  await db.insert(asset).values({
    id: assetId,
    organizationId: session.organizationId,
    projectId: session.projectId,
    kind: session.kind as "image" | "audio",
    source: "uploaded",
    status: "ready", // probe/derivatives land with REQ-AST-005
    storageKey: session.storageKey,
    mime: session.mime,
    bytes: size,
  });
  await db.update(uploadSession).set({ status: "completed" }).where(eq(uploadSession.id, sessionId));
  return assetId;
}

/** Direct server-side path sharing the same validation core (dev/simple UI uploads). */
export async function uploadBytesDirect(
  db: Db,
  input: { organizationId: string; projectId: string | null; kind: "image" | "audio"; mime: string; bytes: Uint8Array }
): Promise<string> {
  validateUpload(input.kind, input.mime, input.bytes.byteLength);
  const assetId = uuidv7();
  const ext = input.mime.split("/")[1] ?? "bin";
  const key = assetKey(input.organizationId, input.projectId, assetId, ext);
  await putObject(key, input.bytes, input.mime);
  await db.insert(asset).values({
    id: assetId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    kind: input.kind,
    source: "uploaded",
    status: "ready",
    storageKey: key,
    mime: input.mime,
    bytes: input.bytes.byteLength,
  });
  return assetId;
}
