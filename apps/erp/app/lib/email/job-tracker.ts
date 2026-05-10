import { redis } from "@/app/lib/redis";

export type EmailJobStatus = "processing" | "completed";

export interface EmailJobState {
  jobId: string;
  total: number;
  sent: number;
  failed: number;
  status: EmailJobStatus;
}

const JOB_KEY_PREFIX = "email-job:";
const JOB_TTL_SECONDS = 60 * 60 * 24;

function jobKey(jobId: string) {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

export async function initializeEmailJob(jobId: string, total: number) {
  await redis.hset(jobKey(jobId), {
    jobId,
    total,
    sent: 0,
    failed: 0,
    status: "processing",
  });
  await redis.expire(jobKey(jobId), JOB_TTL_SECONDS);
}

export async function incrementEmailJobCounters(
  jobId: string,
  sentDelta: number,
  failedDelta: number
) {
  const key = jobKey(jobId);
  if (sentDelta > 0) {
    await redis.hincrby(key, "sent", sentDelta);
  }
  if (failedDelta > 0) {
    await redis.hincrby(key, "failed", failedDelta);
  }

  const state = await getEmailJobState(jobId);
  if (!state) return;

  if (state.sent + state.failed >= state.total) {
    await redis.hset(key, { status: "completed" });
  }

  await redis.expire(key, JOB_TTL_SECONDS);
}

export async function getEmailJobState(jobId: string): Promise<EmailJobState | null> {
  const data = await redis.hgetall<Record<string, string | number>>(jobKey(jobId));
  if (!data || Object.keys(data).length === 0) return null;

  return {
    jobId: String(data.jobId ?? jobId),
    total: Number(data.total ?? 0),
    sent: Number(data.sent ?? 0),
    failed: Number(data.failed ?? 0),
    status: (String(data.status ?? "processing") as EmailJobStatus),
  };
}
