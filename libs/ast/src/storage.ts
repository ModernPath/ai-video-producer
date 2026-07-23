// REQ-AST-001 — S3-compatible object storage adapter (MinIO local, R2/S3 prod).
import {
  CreateBucketCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client,
} from "@aws-sdk/client-s3";

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

let client: S3Client | undefined;
let bucketEnsured = false;

function s3(): S3Client {
  client ??= new S3Client({
    endpoint: env("S3_ENDPOINT", "http://localhost:9100"),
    region: env("S3_REGION", "us-east-1"),
    forcePathStyle: true, // MinIO
    credentials: {
      accessKeyId: env("S3_ACCESS_KEY", "avd"),
      secretAccessKey: env("S3_SECRET_KEY", "avd-secret"),
    },
  });
  return client;
}

export function bucketName(): string {
  return env("S3_BUCKET", "avd-media");
}

async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  try {
    await s3().send(new HeadBucketCommand({ Bucket: bucketName() }));
  } catch {
    await s3().send(new CreateBucketCommand({ Bucket: bucketName() }));
  }
  bucketEnsured = true;
}

export async function putObject(key: string, bytes: Uint8Array, mime: string): Promise<void> {
  await ensureBucket();
  await s3().send(new PutObjectCommand({ Bucket: bucketName(), Key: key, Body: bytes, ContentType: mime }));
}

export async function getObject(key: string): Promise<{ bytes: Uint8Array; mime: string }> {
  await ensureBucket();
  const res = await s3().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return { bytes, mime: res.ContentType ?? "application/octet-stream" };
}

/** docs/12 §5 storage layout. */
export function assetKey(orgId: string, projectId: string | null, assetId: string, ext: string): string {
  return projectId
    ? `${orgId}/${projectId}/assets/${assetId}/original.${ext}`
    : `${orgId}/library/${assetId}/original.${ext}`;
}
