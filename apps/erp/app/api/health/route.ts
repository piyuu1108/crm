/**
 * GET /api/health — Tests connectivity to all backend services.
 *
 * Response format (per AGENTS.md):
 * { success: boolean, data: { db, redis, s3 } }
 *
 * Each service returns { status: "ok" | "error", latencyMs, error? }.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { redis } from "@/app/lib/redis";
import { s3Client } from "@/app/lib/storage";
import { sql } from "drizzle-orm";
import { HeadBucketCommand } from "@aws-sdk/client-s3";

interface ServiceStatus {
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1 AS ping`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown DB error",
    };
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const result = await redis.ping();
    if (result !== "PONG") throw new Error(`Unexpected PING response: ${result}`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown Redis error",
    };
  }
}

async function checkStorage(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const bucket = process.env.S3_BUCKET ?? "erp-dev";
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    console.log(err);
    
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

export async function GET() {
  const [dbStatus, redisStatus, s3Status] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
  ]);

  const allOk =
    dbStatus.status === "ok" &&
    redisStatus.status === "ok" &&
    s3Status.status === "ok";

  return NextResponse.json(
    {
      success: allOk,
      data: {
        db: dbStatus,
        redis: redisStatus,
        s3: s3Status,
      },
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
