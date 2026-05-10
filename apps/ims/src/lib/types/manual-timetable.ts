// ─────────────────────────────────────────────────────────────────────────────
// Manual Timetable Builder — Type Definitions
// Fully client-side timetable editor with localStorage persistence.
// ─────────────────────────────────────────────────────────────────────────────

import type { GenerationPayload } from "./generation";

// ─── Cell Entry ──────────────────────────────────────────────────────────────
/** A single lecture assignment in one timetable cell */
export interface ManualTimetableCell {
  assignmentId: number;
  subjectId: number;
  subjectShortCode: string;
  subjectName: string;
  subjectType: string; // "Theory" | "Practical" | "Both" | ...
  facultyId: number;
  facultyCode: string;
  facultyName: string;
  isLabSession: boolean;
  labId: number | null;
  labName: string | null;
}

// ─── Class Timetable ─────────────────────────────────────────────────────────
/** Complete timetable for a single class */
export interface ClassTimetable {
  classId: number;
  className: string;
  /** grid[day][slot] → cell or null.  day = "monday"…"saturday", slot = "lecture1"…"lecture5" */
  grid: Record<string, Record<string, ManualTimetableCell | null>>;
}

// ─── Store ───────────────────────────────────────────────────────────────────
/** Root localStorage object for `manual_timetable` */
export interface ManualTimetableStore {
  courseId: number;
  courseName: string;
  lastModified: string;
  /** Keyed by classId */
  timetables: Record<number, ClassTimetable>;
}

// ─── Conflicts ───────────────────────────────────────────────────────────────
export type ConflictType = "faculty" | "lab" | "class";

export interface TimetableConflict {
  type: ConflictType;
  day: string;
  slot: string;
  /** The class whose cell has this conflict */
  classId: number;
  className: string;
  /** The OTHER class that conflicts */
  otherClassId: number;
  otherClassName: string;
  /** Human-readable message */
  message: string;
  /** ID of the conflicting entity (facultyId or labId) */
  entityId: number;
  /** Name of the conflicting entity */
  entityName: string;
}

// ─── Master Data ─────────────────────────────────────────────────────────────
/** The shape stored in localStorage under `erp_master_data` */
export type MasterData = GenerationPayload;

// ─── Day / Slot Constants ────────────────────────────────────────────────────
export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const DAY_SHORT_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

export const SLOTS_PER_DAY = 5;

export function slotKey(n: number): string {
  return `lecture${n}`;
}

export function slotLabel(n: number): string {
  return `Lecture ${n}`;
}
