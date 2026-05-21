import { redis } from "@/app/lib/redis";
import { db } from "@/app/lib/db";
import { students } from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

// Centralized TTL management (values in hours per user spec)
export const CACHE_CONFIG = {
  DASHBOARD_HOURS: 2,
  TIMETABLE_HOURS: 12,
  SUBJECTS_HOURS: 24,
  CIRCULARS_HOURS: 6,
  ATTENDANCE_HOURS: 1,
} as const;

// Convert hours to seconds
const hoursToSeconds = (hours: number) => hours * 3600;

export const TTL = {
  DASHBOARD: hoursToSeconds(CACHE_CONFIG.DASHBOARD_HOURS),
  TIMETABLE: hoursToSeconds(CACHE_CONFIG.TIMETABLE_HOURS),
  SUBJECTS: hoursToSeconds(CACHE_CONFIG.SUBJECTS_HOURS),
  CIRCULARS: hoursToSeconds(CACHE_CONFIG.CIRCULARS_HOURS),
  ATTENDANCE: hoursToSeconds(CACHE_CONFIG.ATTENDANCE_HOURS),
} as const;

// Deterministic key builders
export const cacheKeys = {
  dashboard: (userId: number) => `erp:dashboard:user:${userId}`,
  timetable: (divisionId: number) => `erp:timetable:division:${divisionId}`,
  timetableFaculty: (facultyId: number) => `erp:timetable:faculty:${facultyId}`,
  subjects: (divisionId: number, semesterId: number) => `erp:subjects:division:${divisionId}:semester:${semesterId}`,
  circularsDiv: (divisionId: number) => `erp:circulars:division:${divisionId}`,
  circularsYear: (academicYear: number) => `erp:circulars:year:${academicYear}`,
  circularsGlobal: () => `erp:circulars:global`,
  circularsFaculty: () => `erp:circulars:faculty`,
  attendance: (divisionId: number) => `erp:attendance:division:${divisionId}`,
};

// Logging helper
function logCache(action: string, key: string, metadata: Record<string, any> = {}) {
  console.log(`[Cache ${action}] key=${key} ${Object.keys(metadata).map(k => `${k}=${metadata[k]}`).join(" ")}`);
}

interface RememberOptions {
  profiler?: {
    measureAsyncWait: <U>(name: string, type: string, fn: () => Promise<U>) => Promise<U>;
  };
  profilerNamePrefix?: string;
}

/**
 * High-reliability typed cache wrapper with graceful Redis connection failure recovery.
 */
export async function remember<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
  options?: RememberOptions
): Promise<T> {
  const profiler = options?.profiler;
  const prefix = options?.profilerNamePrefix ?? "cache";

  let cachedValue: any = null;
  let didReadSucceed = false;

  try {
    const start = Date.now();
    const fetchFromRedis = async () => {
      try {
        return await redis.get(key);
      } catch (redisError) {
        console.warn(`[Redis GET Error] Failed to read key "${key}":`, redisError);
        return null;
      }
    };

    if (profiler) {
      cachedValue = await profiler.measureAsyncWait(`${prefix}:redisGet`, "redis", fetchFromRedis);
    } else {
      cachedValue = await fetchFromRedis();
    }
    
    didReadSucceed = true;
    const duration = Date.now() - start;

    if (cachedValue !== null && cachedValue !== undefined) {
      logCache("HIT", key, { durationMs: duration });
      if (typeof cachedValue === "string") {
        try {
          return JSON.parse(cachedValue) as T;
        } catch {
          return cachedValue as unknown as T;
        }
      }
      return cachedValue as T;
    }
  } catch (err) {
    console.error(`[Cache Critical Error] Failed during Redis GET flow for key "${key}":`, err);
  }

  if (didReadSucceed) {
    logCache("MISS", key);
  }

  // Fallback to database/source fetch on cache miss or Redis read failure
  const freshValue = await fetchFn();

  try {
    const start = Date.now();
    const writeToRedis = async () => {
      try {
        // Store as serialized JSON
        await redis.set(key, JSON.stringify(freshValue), { ex: ttlSeconds });
      } catch (redisError) {
        console.warn(`[Redis SET Error] Failed to write key "${key}":`, redisError);
      }
    };

    if (profiler) {
      await profiler.measureAsyncWait(`${prefix}:redisSet`, "redis", writeToRedis);
    } else {
      await writeToRedis();
    }
    
    const duration = Date.now() - start;
    logCache("SET", key, { durationMs: duration, ttl: ttlSeconds });
  } catch (err) {
    console.error(`[Cache Critical Error] Failed during Redis SET flow for key "${key}":`, err);
  }

  return freshValue;
}

/**
 * Delete a specific key from Redis.
 */
export async function invalidateKey(key: string) {
  try {
    const start = Date.now();
    await redis.del(key);
    logCache("INVALIDATE", key, { durationMs: Date.now() - start });
  } catch (err) {
    console.error(`[Cache Error] Failed to invalidate key "${key}":`, err);
  }
}

/**
 * Invalidate the dashboard cache of a specific user.
 */
export async function invalidateDashboard(userId: number) {
  await invalidateKey(cacheKeys.dashboard(userId));
}

/**
 * Pipelined deletion helper to invalidate dashboards of all students in a division.
 */
export async function invalidateStudentDashboardsInDivision(divisionId: number) {
  try {
    const start = Date.now();
    const studentRows = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.currentDivisionId, divisionId));

    if (studentRows.length > 0) {
      const pipeline = redis.pipeline();
      for (const student of studentRows) {
        pipeline.del(cacheKeys.dashboard(student.id));
      }
      await pipeline.exec();
      logCache("INVALIDATE_DASHBOARDS_DIVISION", `division:${divisionId}`, {
        count: studentRows.length,
        durationMs: Date.now() - start,
      });
    }
  } catch (err) {
    console.error(`[Cache Error] Failed to invalidate student dashboards in division ${divisionId}:`, err);
  }
}

/**
 * Event invalidation trigger: TIMETABLE_UPDATED.
 * Invalidates timetable entries cache and pipelines student dashboards.
 */
export async function invalidateTimetableUpdated(divisionId: number) {
  await invalidateKey(cacheKeys.timetable(divisionId));
  await invalidateStudentDashboardsInDivision(divisionId);
}

export async function invalidateAttendanceUpdated(divisionId: number) {
  await invalidateKey(cacheKeys.attendance(divisionId));
  await invalidateStudentDashboardsInDivision(divisionId);
}

/**
 * Event invalidation trigger: SUBJECTS_UPDATED.
 * Invalidates subjects lists cache.
 */
export async function invalidateSubjectsUpdated(divisionId: number, semesterId: number) {
  await invalidateKey(cacheKeys.subjects(divisionId, semesterId));
}

/**
 * Event invalidation trigger: CIRCULAR_UPDATED.
 * Invalidates specific circular segments depending on the target configuration.
 */
export async function invalidateCircularUpdated(circular: {
  targetType: string;
  targetYear?: number | null;
  recipientDivisions?: number[];
}) {
  const type = circular.targetType;
  if (type === "ALL") {
    await invalidateKey(cacheKeys.circularsGlobal());
  } else if (type === "FACULTY") {
    await invalidateKey(cacheKeys.circularsFaculty());
  } else if (type === "YEAR" && circular.targetYear) {
    await invalidateKey(cacheKeys.circularsYear(circular.targetYear));
  } else if (type === "DIVISION" && circular.recipientDivisions) {
    for (const divId of circular.recipientDivisions) {
      await invalidateKey(cacheKeys.circularsDiv(divId));
    }
  }
}
