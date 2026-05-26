/**
 * Server-side Convex HTTP client.
 * Used inside Next.js API routes to call Convex mutations (e.g. publishNotification).
 */
import { ConvexHttpClient } from "convex/browser";

export const convexClient = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);
