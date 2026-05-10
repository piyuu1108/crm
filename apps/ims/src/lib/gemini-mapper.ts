// ─────────────────────────────────────────────────────────────────────────────
// Gemini AI Timetable Mapper
// Converts Gemini's ID-based output → viewer's name-based WeeklyGrid format
// Also derives faculty and lab timetables from class timetables.
// ─────────────────────────────────────────────────────────────────────────────

export interface GeminiSlotEntry {
  slot: number;
  subjectId: number;
  facultyId: number;
  roomId: number | null;
  type: "THEORY" | "LAB";
}

export interface GeminiTimetable {
  status: string;
  score: number;
  metadata: any;
  statistics: any;
  conflicts: any[];
  warnings: any[];
  timetable: Record<string, Record<string, GeminiSlotEntry[]>>;
}

export interface PayloadMeta {
  metadata: {
    daysPerWeek: number;
    dayNames: string[];
    slotsPerDay: number;
  };
  classes: Array<{ id: number; name: string }>;
  subjects: Array<{ id: number; code: string; name: string; shortCode: string; credit: number }>;
  faculties: Array<{ id: number; code: string; name: string }>;
  rooms: Array<{ id: number; name: string; isLab: boolean }>;
  assignments: Array<{
    assignmentId: number;
    classId: number;
    subjectId: number;
    facultyId: number;
    subjectShortCode: string;
    subjectCode: string;
    subjectName: string;
    subjectCredit: number;
    facultyCode: string;
    facultyName: string;
  }>;
}

interface SlotEntry {
  subject: string;
  subjectCode: string;
  subjectName: string;
  faculty: string;
  facultyName: string;
  type: "theory" | "lab";
  duration: number;
  room?: string;
}

type DayGrid = Record<string, SlotEntry | null>;
type WeeklyGrid = Record<string, DayGrid>;

const DAY_NORMALIZE: Record<string, string> = {
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
};

/**
 * Convert Gemini's AI output into the same format the TimetableGrid viewer expects.
 */
export function mapGeminiResult(
  aiResult: GeminiTimetable,
  payload: PayloadMeta,
): {
  classTimetables: Record<string, WeeklyGrid>;
  facultyTimetables: Record<string, WeeklyGrid>;
  labTimetables: Record<string, WeeklyGrid>;
} {
  const { slotsPerDay, dayNames } = payload.metadata;

  // Build lookup maps
  const classMap = new Map(payload.classes.map((c) => [c.id, c]));
  const subjectMap = new Map(payload.subjects.map((s) => [s.id, s]));
  const facultyMap = new Map(payload.faculties.map((f) => [f.id, f]));
  const roomMap = new Map(payload.rooms.map((r) => [r.id, r]));

  // Also build assignment lookup for subject-faculty pairing metadata
  const assignLookup = new Map<string, typeof payload.assignments[0]>();
  for (const a of payload.assignments) {
    assignLookup.set(`${a.classId}:${a.subjectId}:${a.facultyId}`, a);
  }

  // ── 1. Build class timetables ──
  const classTimetables: Record<string, WeeklyGrid> = {};

  // Track all resolved slots for faculty/lab derivation
  const allResolvedSlots: Array<{
    dayKey: string;
    slot: number;
    entry: SlotEntry;
    classId: number;
    facultyId: number;
    roomId: number | null;
    duration: number;
  }> = [];

  for (const [classIdStr, dayMap] of Object.entries(aiResult.timetable || {})) {
    const classId = parseInt(classIdStr, 10);
    const cls = classMap.get(classId);
    const className = cls?.name || `Class-${classId}`;

    const weeklyGrid: WeeklyGrid = {};

    for (const dayName of dayNames) {
      const dayKey = DAY_NORMALIZE[dayName] || dayName.toLowerCase();
      const dayGrid: DayGrid = {};

      // Init all slots as null
      for (let s = 1; s <= slotsPerDay; s++) {
        dayGrid[`lecture${s}`] = null;
      }

      // Get entries for this day from Gemini output
      const dayEntries: GeminiSlotEntry[] = dayMap?.[dayName] || [];

      // Detect lab spans: consecutive same subject+faculty+room LAB entries
      const processed = new Set<number>();

      for (let i = 0; i < dayEntries.length; i++) {
        const e = dayEntries[i];
        if (processed.has(i)) continue;

        const sub = subjectMap.get(e.subjectId);
        const fac = facultyMap.get(e.facultyId);
        const room = e.roomId != null ? roomMap.get(e.roomId) : undefined;

        // Count consecutive lab slots for duration
        let duration = 1;
        if (e.type === "LAB") {
          for (let j = i + 1; j < dayEntries.length; j++) {
            const next = dayEntries[j];
            if (
              next.type === "LAB" &&
              next.subjectId === e.subjectId &&
              next.facultyId === e.facultyId &&
              next.roomId === e.roomId &&
              next.slot === e.slot + (j - i) // must be consecutive slots
            ) {
              duration++;
              processed.add(j);
            } else {
              break;
            }
          }
        }

        const assignKey = `${classId}:${e.subjectId}:${e.facultyId}`;
        const assign = assignLookup.get(assignKey);

        const entry: SlotEntry = {
          subject: assign?.subjectShortCode || sub?.shortCode || sub?.code || `SUB-${e.subjectId}`,
          subjectCode: sub?.code || `${e.subjectId}`,
          subjectName: sub?.name || `Subject ${e.subjectId}`,
          faculty: fac?.code || `FAC-${e.facultyId}`,
          facultyName: fac?.name || `Faculty ${e.facultyId}`,
          type: e.type === "LAB" ? "lab" : "theory",
          duration,
        };

        if (room) {
          entry.room = room.name;
        }

        dayGrid[`lecture${e.slot}`] = entry;

        allResolvedSlots.push({
          dayKey,
          slot: e.slot,
          entry,
          classId,
          facultyId: e.facultyId,
          roomId: e.roomId,
          duration,
        });

        processed.add(i);
      }

      weeklyGrid[dayKey] = dayGrid;
    }

    classTimetables[className] = weeklyGrid;
  }

  // ── 2. Derive faculty timetables ──
  const facultyTimetables: Record<string, WeeklyGrid> = {};

  // Group slots by faculty
  const facSlots = new Map<number, typeof allResolvedSlots>();
  for (const s of allResolvedSlots) {
    let arr = facSlots.get(s.facultyId);
    if (!arr) { arr = []; facSlots.set(s.facultyId, arr); }
    arr.push(s);
  }

  for (const [facId, slots] of Array.from(facSlots)) {
    const fac = facultyMap.get(facId);
    const facCode = fac?.code || `FAC-${facId}`;

    const weeklyGrid: WeeklyGrid = {};
    for (const dayName of dayNames) {
      const dayKey = DAY_NORMALIZE[dayName] || dayName.toLowerCase();
      const dayGrid: DayGrid = {};
      for (let s = 1; s <= slotsPerDay; s++) dayGrid[`lecture${s}`] = null;

      const daySlots = slots.filter((sl) => sl.dayKey === dayKey);
      for (const sl of daySlots) {
        dayGrid[`lecture${sl.slot}`] = sl.entry;
      }
      weeklyGrid[dayKey] = dayGrid;
    }
    facultyTimetables[facCode] = weeklyGrid;
  }

  // ── 3. Derive lab timetables ──
  const labTimetables: Record<string, WeeklyGrid> = {};

  const labSlots = new Map<number, typeof allResolvedSlots>();
  for (const s of allResolvedSlots) {
    if (s.roomId == null) continue;
    let arr = labSlots.get(s.roomId);
    if (!arr) { arr = []; labSlots.set(s.roomId, arr); }
    arr.push(s);
  }

  for (const [roomId, slots] of Array.from(labSlots)) {
    const room = roomMap.get(roomId);
    if (!room || !room.isLab) continue;

    const weeklyGrid: WeeklyGrid = {};
    for (const dayName of dayNames) {
      const dayKey = DAY_NORMALIZE[dayName] || dayName.toLowerCase();
      const dayGrid: DayGrid = {};
      for (let s = 1; s <= slotsPerDay; s++) dayGrid[`lecture${s}`] = null;

      const daySlotsList = slots.filter((sl) => sl.dayKey === dayKey);
      for (const sl of daySlotsList) {
        dayGrid[`lecture${sl.slot}`] = sl.entry;
      }
      weeklyGrid[dayKey] = dayGrid;
    }
    labTimetables[room.name] = weeklyGrid;
  }

  return { classTimetables, facultyTimetables, labTimetables };
}
