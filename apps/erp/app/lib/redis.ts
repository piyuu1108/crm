/**
 * Redis client — Upstash REST-based (HTTP).
 *
 * Used for rate limiting, request tracking, and short-lived caches.
 * Must NOT store persistent business data (per AGENTS.md).
 */
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
