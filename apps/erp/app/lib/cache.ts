import { db } from "@/app/lib/db";
import { students } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/app/lib/redis";

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

// Deterministic key/tag builders
export const cacheTags = {
  dashboard: {
    user: (userId: number) => `erp:dashboard:user:${userId}` as const,
    division: (divisionId: number) => `erp:dashboard:division:${divisionId}` as const,
  },
  timetable: {
    division: (divisionId: number) => `erp:timetable:division:${divisionId}` as const,
    faculty: (facultyId: number) => `erp:timetable:faculty:${facultyId}` as const,
  },
  subjects: {
    division: (divisionId: number, semesterId: number) => `erp:subjects:division:${divisionId}:semester:${semesterId}` as const,
    faculty: (facultyId: number) => `erp:subjects:faculty:${facultyId}` as const,
  },
  circulars: {
    division: (divisionId: number) => `erp:circulars:division:${divisionId}` as const,
    year: (academicYear: number) => `erp:circulars:year:${academicYear}` as const,
    global: () => `erp:circulars:global` as const,
    faculty: () => `erp:circulars:faculty` as const,
  },
  attendance: {
    division: (divisionId: number) => `erp:attendance:division:${divisionId}` as const,
  },
  admin: {
    divisionsList: (page: number, limit: number) => `erp:admin:divisions:list:page:${page}:limit:${limit}` as const,
    facultyList: (page: number, limit: number, search: string, status: string, sortBy: string, sortOrder: string) =>
      `erp:admin:faculty:list:page:${page}:limit:${limit}:search:${search}:status:${status}:sortBy:${sortBy}:sortOrder:${sortOrder}` as const,
  },
} as const;

/**
 * Maps semester index to the corresponding academic year (e.g. Sem 1 & 2 -> Year 1, Sem 3 & 4 -> Year 2)
 */
export function semesterToAcademicYear(semesterId: number): number {
  return Math.ceil(semesterId / 2);
}

/**
 * High-reliability typed cache wrapper using Upstash Redis.
 * Accepts an optional array of secondary tags for multi-tag grouping and auto-expires them.
 */
export async function remember<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
  tags?: string[]
): Promise<T> {
  console.log(`[Cache REMEMBER] key=${key} tags=${tags ? tags.join(",") : "none"}`);

  // 1. Try to read from Upstash Redis
  try {
    const cached = await redis.get<string>(key);
    if (cached) {
      console.log(`🟢 [Cache HIT] key=${key}`);
      return (typeof cached === "string" ? JSON.parse(cached) : cached) as T;
    }
  } catch (err) {
    console.error(`[Cache Error] Failed to read from Redis for key=${key}`, err);
  }

  // 2. Fetch from database on miss
  console.log(`🔴 [Cache MISS] key=${key} → Fetching from Database`);
  const data = await fetchFn();

  // 3. Write back to Redis
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });

    // Track keys inside set tags for multi-tag invalidation
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await redis.sadd(`tag:${tag}`, key);
        await redis.expire(`tag:${tag}`, ttlSeconds); // Smart automatic garbage-collection of tag sets
      }
    }
  } catch (err) {
    console.error(`[Cache Error] Failed to write to Redis for key=${key}`, err);
  }

  return data;
}

/**
 * Delete/purge a tag or key from Upstash Redis Cache.
 * Resolves all key associations and deletes them concurrently.
 */
export async function clearCache(key: string): Promise<void> {
  console.log(`🧹 [Cache INVALIDATE] tag/key=${key}`);
  try {
    // 1. Delete the primary key itself
    await redis.del(key);

    // 2. Lookup and delete all keys grouped under this tag
    const taggedKeys = await redis.smembers(`tag:${key}`);
    if (taggedKeys.length > 0) {
      await redis.del(...taggedKeys);
      await redis.del(`tag:${key}`);
    }
  } catch (err) {
    console.error(`[Cache Error] Invalidation failed for tag/key=${key}`, err);
  }
}


