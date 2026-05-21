import { redis } from "@/app/lib/redis";

export type EmailJobStatus = "processing" | "completed";

export interface EmailJobState {
  jobId: string;
  total: number;
  sent: number;
  failed: number;
  status: EmailJobStatus;
  failedEmails?: string[];
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
    failedEmails: JSON.stringify([]),
  });
  await redis.expire(jobKey(jobId), JOB_TTL_SECONDS);
}

export async function incrementEmailJobCounters(
  jobId: string,
  sentDelta: number,
  failedDelta: number,
  failedEmails?: string[]
) {
  const key = jobKey(jobId);
  if (sentDelta > 0) {
    await redis.hincrby(key, "sent", sentDelta);
  }
  if (failedDelta > 0) {
    await redis.hincrby(key, "failed", failedDelta);
  }
  if (failedEmails && failedEmails.length > 0) {
    const existing = await redis.hget<string>(key, "failedEmails");
    let currentList: string[] = [];
    if (existing) {
      try {
        currentList = typeof existing === "string" ? JSON.parse(existing) : existing;
      } catch {
        currentList = [];
      }
    }
    const newList = Array.from(new Set([...currentList, ...failedEmails]));
    await redis.hset(key, { failedEmails: JSON.stringify(newList) });
  }

  const state = await getEmailJobState(jobId);
  if (!state) return;

  if (state.sent + state.failed >= state.total) {
    await redis.hset(key, { status: "completed" });
  }

  await redis.expire(key, JOB_TTL_SECONDS);
}

export async function getEmailJobState(jobId: string): Promise<EmailJobState | null> {
  const data = await redis.hgetall<Record<string, unknown>>(jobKey(jobId));
  if (!data || Object.keys(data).length === 0) return null;

  let failedEmails: string[] = [];
  if (data.failedEmails) {
    try {
      failedEmails = typeof data.failedEmails === "string"
        ? JSON.parse(data.failedEmails)
        : (data.failedEmails as string[]);
    } catch {
      failedEmails = [];
    }
  }

  return {
    jobId: String(data.jobId ?? jobId),
    total: Number(data.total ?? 0),
    sent: Number(data.sent ?? 0),
    failed: Number(data.failed ?? 0),
    status: (String(data.status ?? "processing") as EmailJobStatus),
    failedEmails,
  };
}
