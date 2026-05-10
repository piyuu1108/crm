/**
 * Object storage client — S3-compatible (R2 / MinIO).
 *
 * Used for direct client uploads. Backend stores only file references
 * in the database (per AGENTS.md).
 */
import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

export const S3_BUCKET = process.env.S3_BUCKET ?? "erp-dev";
