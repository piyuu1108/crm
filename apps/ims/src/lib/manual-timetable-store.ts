// ─────────────────────────────────────────────────────────────────────────────
// Manual Timetable Builder — localStorage Store & Conflict Engine
// Pure functions, zero React dependencies, zero API calls.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ManualTimetableStore,
  ManualTimetableCell,
  ClassTimetable,
  TimetableConflict,
  MasterData,
} from "./types/manual-timetable";
import { DAY_KEYS, SLOTS_PER_DAY, slotKey } from "./types/manual-timetable";

// ─── localStorage Keys ───────────────────────────────────────────────────────
const MASTER_KEY = "erp_master_data";
const TIMETABLE_KEY = "manual_timetable";

// ─── Master Data ─────────────────────────────────────────────────────────────

export function loadMasterData(): MasterData | null {
  try {
    const raw = localStorage.getItem(MASTER_KEY);
    return raw ? (JSON.parse(raw) as MasterData) : null;
  } catch {
    return null;
  }
}

export function saveMasterData(data: MasterData): void {
  localStorage.setItem(MASTER_KEY, JSON.stringify(data));
}

export function clearMasterData(): void {
  localStorage.removeItem(MASTER_KEY);
}

// ─── Timetable Store ─────────────────────────────────────────────────────────

export function loadTimetable(): ManualTimetableStore | null {
  try {
    const raw = localStorage.getItem(TIMETABLE_KEY);
    return raw ? (JSON.parse(raw) as ManualTimetableStore) : null;
  } catch {
    return null;
  }
}

export function saveTimetable(store: ManualTimetableStore): void {
  localStorage.setItem(TIMETABLE_KEY, JSON.stringify(store));
}

export function clearTimetableStorage(): void {
  localStorage.removeItem(TIMETABLE_KEY);
}

// ─── Empty Grid Helpers ──────────────────────────────────────────────────────

/** Create an empty day→slot grid for a class */
function createEmptyGrid(): Record<
  string,
  Record<string, ManualTimetableCell | null>
> {
  const grid: Record<string, Record<string, ManualTimetableCell | null>> = {};
  for (const day of DAY_KEYS) {
    grid[day] = {};
    for (let s = 1; s <= SLOTS_PER_DAY; s++) {
      grid[day][slotKey(s)] = null;
    }
  }
  return grid;
}

/** Ensure a class exists in the store, creating empty grid if needed */
export function ensureClass(
  store: ManualTimetableStore,
  classId: number,
  className: string
): ManualTimetableStore {
  if (store.timetables[classId]) return store;
  return {
    ...store,
    timetables: {
      ...store.timetables,
      [classId]: { classId, className, grid: createEmptyGrid() },
    },
  };
}

/** Create a blank store for a course */
export function createEmptyStore(
  courseId: number,
  courseName: string
): ManualTimetableStore {
  return {
    courseId,
    courseName,
    lastModified: new Date().toISOString(),
    timetables: {},
  };
}

// ─── Cell Operations ─────────────────────────────────────────────────────────

/** Update a single cell and immediately persist. Returns the updated store. */
export function updateCell(
  store: ManualTimetableStore,
  classId: number,
  className: string,
  day: string,
  slot: string,
  cell: ManualTimetableCell
): ManualTimetableStore {
  const updated = ensureClass(store, classId, className);
  const newStore: ManualTimetableStore = {
    ...updated,
    lastModified: new Date().toISOString(),
    timetables: {
      ...updated.timetables,
      [classId]: {
        ...updated.timetables[classId],
        grid: {
          ...updated.timetables[classId].grid,
          [day]: {
            ...updated.timetables[classId].grid[day],
            [slot]: cell,
          },
        },
      },
    },
  };
  saveTimetable(newStore);
  return newStore;
}

/** Clear a single cell and persist. */
export function clearCell(
  store: ManualTimetableStore,
  classId: number,
  day: string,
  slot: string
): ManualTimetableStore {
  if (!store.timetables[classId]) return store;
  const newStore: ManualTimetableStore = {
    ...store,
    lastModified: new Date().toISOString(),
    timetables: {
      ...store.timetables,
      [classId]: {
        ...store.timetables[classId],
        grid: {
          ...store.timetables[classId].grid,
          [day]: {
            ...store.timetables[classId].grid[day],
            [slot]: null,
          },
        },
      },
    },
  };
  saveTimetable(newStore);
  return newStore;
}

/** Copy a cell to another position (drag = copy, not cut). Persists immediately. */
export function copyCell(
  store: ManualTimetableStore,
  classId: number,
  fromDay: string,
  fromSlot: string,
  toDay: string,
  toSlot: string
): ManualTimetableStore {
  if (!store.timetables[classId]) return store;
  if (fromDay === toDay && fromSlot === toSlot) return store;

  const grid = store.timetables[classId].grid;
  const source = grid[fromDay]?.[fromSlot] ?? null;
  if (!source) return store;

  const newStore: ManualTimetableStore = {
    ...store,
    lastModified: new Date().toISOString(),
    timetables: {
      ...store.timetables,
      [classId]: {
        ...store.timetables[classId],
        grid: {
          ...grid,
          [toDay]: {
            ...grid[toDay],
            [toSlot]: { ...source }, // copy the cell data
          },
        },
      },
    },
  };
  saveTimetable(newStore);
  return newStore;
}

/** Clear an entire class timetable and persist. */
export function clearClassTimetable(
  store: ManualTimetableStore,
  classId: number
): ManualTimetableStore {
  if (!store.timetables[classId]) return store;
  const newStore: ManualTimetableStore = {
    ...store,
    lastModified: new Date().toISOString(),
    timetables: {
      ...store.timetables,
      [classId]: {
        ...store.timetables[classId],
        grid: createEmptyGrid(),
      },
    },
  };
  saveTimetable(newStore);
  return newStore;
}

/** Clear ALL timetables for the course and persist. */
export function clearAllTimetables(
  store: ManualTimetableStore
): ManualTimetableStore {
  const newStore: ManualTimetableStore = {
    ...store,
    lastModified: new Date().toISOString(),
    timetables: {},
  };
  saveTimetable(newStore);
  return newStore;
}

// ─── Conflict Engine ─────────────────────────────────────────────────────────

/**
 * Calculate ALL conflicts across all classes in the store.
 * Runs entirely in-memory, zero API calls.
 *
 * Detects:
 * 1. Faculty conflicts — same faculty in same day+slot across different classes
 * 2. Lab conflicts — same lab in same day+slot across different classes
 *
 * Class conflicts (same class, same slot) are impossible by data structure
 * since each class has exactly one cell per day+slot.
 */
export function calculateAllConflicts(
  store: ManualTimetableStore
): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];

  // Build lookup maps: "entityType:entityId:day:slot" → list of {classId, className, cell}
  const facultyMap = new Map<
    string,
    { classId: number; className: string; cell: ManualTimetableCell }[]
  >();
  const labMap = new Map<
    string,
    { classId: number; className: string; cell: ManualTimetableCell }[]
  >();

  for (const ct of Object.values(store.timetables)) {
    for (const day of DAY_KEYS) {
      const dayGrid = ct.grid[day];
      if (!dayGrid) continue;
      for (let s = 1; s <= SLOTS_PER_DAY; s++) {
        const slot = slotKey(s);
        const cell = dayGrid[slot];
        if (!cell) continue;

        // Faculty tracking
        const fKey = `${cell.facultyId}:${day}:${slot}`;
        if (!facultyMap.has(fKey)) facultyMap.set(fKey, []);
        facultyMap.get(fKey)!.push({
          classId: ct.classId,
          className: ct.className,
          cell,
        });

        // Lab tracking
        if (cell.isLabSession && cell.labId !== null) {
          const lKey = `${cell.labId}:${day}:${slot}`;
          if (!labMap.has(lKey)) labMap.set(lKey, []);
          labMap.get(lKey)!.push({
            classId: ct.classId,
            className: ct.className,
            cell,
          });
        }
      }
    }
  }

  // Faculty conflicts
  for (const [key, entries] of facultyMap) {
    if (entries.length < 2) continue;
    const [, day, slot] = key.split(":");
    // Create a conflict for each pair
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        conflicts.push({
          type: "faculty",
          day,
          slot,
          classId: a.classId,
          className: a.className,
          otherClassId: b.classId,
          otherClassName: b.className,
          message: `${a.cell.facultyName} already assigned in ${b.className}`,
          entityId: a.cell.facultyId,
          entityName: a.cell.facultyName,
        });
        conflicts.push({
          type: "faculty",
          day,
          slot,
          classId: b.classId,
          className: b.className,
          otherClassId: a.classId,
          otherClassName: a.className,
          message: `${b.cell.facultyName} already assigned in ${a.className}`,
          entityId: b.cell.facultyId,
          entityName: b.cell.facultyName,
        });
      }
    }
  }

  // Lab conflicts
  for (const [key, entries] of labMap) {
    if (entries.length < 2) continue;
    const [, day, slot] = key.split(":");
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        conflicts.push({
          type: "lab",
          day,
          slot,
          classId: a.classId,
          className: a.className,
          otherClassId: b.classId,
          otherClassName: b.className,
          message: `${a.cell.labName} already occupied by ${b.className}`,
          entityId: a.cell.labId!,
          entityName: a.cell.labName!,
        });
        conflicts.push({
          type: "lab",
          day,
          slot,
          classId: b.classId,
          className: b.className,
          otherClassId: a.classId,
          otherClassName: a.className,
          message: `${b.cell.labName} already occupied by ${a.className}`,
          entityId: b.cell.labId!,
          entityName: b.cell.labName!,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get conflicts for a specific cell in a specific class.
 * Useful for rendering inline warnings.
 */
export function getConflictsForCell(
  allConflicts: TimetableConflict[],
  classId: number,
  day: string,
  slot: string
): TimetableConflict[] {
  return allConflicts.filter(
    (c) => c.classId === classId && c.day === day && c.slot === slot
  );
}

/**
 * Preview what conflicts would arise if a cell were placed.
 * Does NOT modify the store — used for real-time preview in the modal.
 */
export function previewConflicts(
  store: ManualTimetableStore,
  classId: number,
  className: string,
  day: string,
  slot: string,
  cell: ManualTimetableCell
): TimetableConflict[] {
  const preview: TimetableConflict[] = [];

  for (const ct of Object.values(store.timetables)) {
    if (ct.classId === classId) continue; // skip self
    const existing = ct.grid[day]?.[slot];
    if (!existing) continue;

    // Faculty conflict
    if (existing.facultyId === cell.facultyId) {
      preview.push({
        type: "faculty",
        day,
        slot,
        classId,
        className,
        otherClassId: ct.classId,
        otherClassName: ct.className,
        message: `${cell.facultyName} already assigned in ${ct.className}`,
        entityId: cell.facultyId,
        entityName: cell.facultyName,
      });
    }

    // Lab conflict
    if (
      cell.isLabSession &&
      cell.labId !== null &&
      existing.isLabSession &&
      existing.labId === cell.labId
    ) {
      preview.push({
        type: "lab",
        day,
        slot,
        classId,
        className,
        otherClassId: ct.classId,
        otherClassName: ct.className,
        message: `${cell.labName} already occupied by ${ct.className}`,
        entityId: cell.labId,
        entityName: cell.labName!,
      });
    }
  }

  return preview;
}
