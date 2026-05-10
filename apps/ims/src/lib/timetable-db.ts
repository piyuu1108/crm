// ─────────────────────────────────────────────────────────────────────────────
// Dexie.js — IndexedDB wrapper for timetable draft persistence
// Stores the generated timetable locally for page refresh persistence.
// ─────────────────────────────────────────────────────────────────────────────

import Dexie, { type EntityTable } from "dexie";

export interface StoredTimetable {
  id: string; // always "latest"
  generatedAt: string;
  courseName: string;
  score: number;
  allocations: any[];
  classTimetables: Record<string, any>;
  facultyTimetables: Record<string, any>;
  labTimetables: Record<string, any>;
  metadata: {
    retries: number;
    durationMs: number;
    totalTasks: number;
    placedTasks: number;
    seed?: number;
  };
}

const db = new Dexie("TimetableDB") as Dexie & {
  generated_timetable: EntityTable<StoredTimetable, "id">;
};

db.version(1).stores({
  generated_timetable: "id",
});

/**
 * Save a generated timetable to IndexedDB.
 * Always overwrites the "latest" entry.
 */
export async function saveTimetable(result: Omit<StoredTimetable, "id">): Promise<void> {
  await db.generated_timetable.put({ id: "latest", ...result });
}

/**
 * Load the latest generated timetable from IndexedDB.
 * Returns null if no timetable has been generated yet.
 */
export async function loadTimetable(): Promise<StoredTimetable | null> {
  const record = await db.generated_timetable.get("latest");
  return record ?? null;
}

/**
 * Clear the stored timetable.
 */
export async function clearTimetable(): Promise<void> {
  await db.generated_timetable.delete("latest");
}

export { db };
