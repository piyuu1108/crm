// ─── Timetable Generation Data Types ──────────────────────────────────
// Fully normalized, self-contained types for client-side timetable engine.
// After receiving GenerationPayload, the engine needs ZERO additional DB calls.

export interface GenerationMetadata {
  generatedAt: string;
  courseId: number;
  courseName: string;
  daysPerWeek: 6;
  dayNames: string[];
  slotsPerDay: 5;
  breakAfterSlot: 2;
  breakGroups: { A: number[]; B: number[] };
  validLabWindows: Record<number, number[][]>;
}

export interface GenClass {
  id: number;
  name: string;
  year: number;
  semester: number;
  divisionNumber: number;
  courseId: number;
  specName: string;
  specShortCode: string;
}

export interface GenSubject {
  id: number;
  code: string;
  name: string;
  shortCode: string;
  credit: number;
  type: "Theory" | "Practical" | "Both" | "ProjectMinor" | "ProjectMajor";
  semester: number;
  courseId: number;
}

export interface GenFaculty {
  id: number;
  code: string;
  name: string;
  courseId: number;
}

export interface GenRoom {
  id: number;
  name: string;
  isLab: boolean;
}

export interface GenLabSession {
  id: number;
  assignmentId: number;
  sessionType: "Theory" | "Lab";
  roomId: number | null;
  roomName: string | null;
  durationSlots: number;
}

export interface GenLectureRequirement {
  assignmentId: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectCode: string;
  subjectShortCode: string;
  subjectName: string;
  subjectCredit: number;
  subjectType: string;
  facultyId: number;
  facultyCode: string;
  facultyName: string;
  semester: number;

  // ── Derived scheduling fields ──
  /** Number of theory lectures to schedule per week */
  theoryPerWeek: number;
  /** Number of lab sessions to schedule per week */
  labCount: number;
  /** Slots consumed per lab session (1 or 2) */
  labDurationSlots: number;
  /** Total timetable slots consumed by labs per week: labCount × labDurationSlots */
  weeklyLabSlotConsumption: number;
  /** Total timetable slots needed per week: theoryPerWeek + weeklyLabSlotConsumption */
  totalWeeklySlots: number;
  /** True if subject has at least one Lab-type session */
  isLabSubject: boolean;
  /** True if any lab session has durationSlots > 1 */
  hasMultiSlotLab: boolean;
  /** Room ID from lab_sessions (treated as preferred lab for SC-10) */
  preferredLabId: number | null;
  /** All unique room IDs from lab sessions for this assignment */
  assignedLabIds: number[];
}

export interface GenerationValidationError {
  type: "missing_faculty" | "missing_lab_config" | "incomplete_credits" | "invalid_requirement";
  assignmentId?: number;
  classId?: number;
  subjectId?: number;
  message: string;
}

export interface GenerationPayload {
  metadata: GenerationMetadata;
  classes: GenClass[];
  subjects: GenSubject[];
  faculties: GenFaculty[];
  rooms: GenRoom[];
  assignments: GenLectureRequirement[];
  labSessions: GenLabSession[];
  validation: {
    valid: boolean;
    errors: GenerationValidationError[];
    warnings: GenerationValidationError[];
  };
}
