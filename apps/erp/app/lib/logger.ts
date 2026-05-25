// lib/logger.ts
import { Axiom } from "@axiomhq/js";

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN!,
});

const DATASET = process.env.AXIOM_DATASET!;

// 🔹 Define strict event shape (important)
export type LogEvent = {
  type: string;
  userId?: string;
  role?: "student" | "faculty" | "counselor" | "hod" | "admin" | "principal" | "vice_principal";
  action?: string;
  ts?: number;
  ip?: string | null;
  ua?: string | null;
  meta?: Record<string, unknown>;
};

// 🔹 Fire-and-forget logger
export function logEvent(event: LogEvent): void {
  try {
    axiom
      .ingest(DATASET, [
        {
          ts: Date.now(),
          ...event,
        },
      ])
  } catch {
    // never break main app
  }
}