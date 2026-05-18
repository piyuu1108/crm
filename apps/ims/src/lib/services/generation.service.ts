import { db } from "@/db";
import {
  assignments,
  subjects,
  faculty,
  classes,
  rooms,
  labSessions,
  specializations,
  courses,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import type {
  GenerationPayload,
  GenClass,
  GenSubject,
  GenFaculty,
  GenRoom,
  GenLabSession,
  GenLectureRequirement,
  GenerationValidationError,
  GenerationMetadata,
} from "@/lib/types/generation";

// ─── Constants ────────────────────────────────────────────────────────
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS_PER_DAY = 5 as const;
const DAYS_PER_WEEK = 6 as const;
const BREAK_AFTER_SLOT = 2 as const;
const BREAK_GROUPS = { A: [1, 2], B: [3, 4, 5] };
const VALID_LAB_WINDOWS: Record<number, number[][]> = {
  1: [[1], [2], [3], [4], [5]],
  2: [[1, 2], [3, 4], [4, 5]],
};

/**
 * Build the complete generation payload for a given course.
 * After receiving this, the client-side engine needs ZERO additional DB calls.
 */
export async function getGenerationData(
  courseId: number
): Promise<GenerationPayload> {
  // ─── 1. Fetch course name ──────────────────────────────────────────
  const [course] = await db
    .select({ id: courses.id, name: courses.name })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) {
    throw new Error(`Course with ID ${courseId} not found`);
  }

  // ─── 2. Parallel fetch all entities ─────────────────────────────────
  const [
    classRows,
    subjectRows,
    facultyRows,
    roomRows,
    assignmentRows,
    labSessionRows,
    specRows,
  ] = await Promise.all([
    // Classes for this course
    db
      .select({
        id: classes.id,
        name: classes.name,
        year: classes.year,
        semester: classes.semester,
        courseId: classes.courseId,
        divisionNumber: classes.divisionNumber,
        specializationId: classes.specializationId,
      })
      .from(classes)
      .where(eq(classes.courseId, courseId))
      .orderBy(asc(classes.semester), asc(classes.divisionNumber)),

    // All subjects for this course
    db
      .select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        shortCode: subjects.shortCode,
        credit: subjects.credit,
        type: subjects.type,
        semester: subjects.semester,
        courseId: subjects.courseId,
      })
      .from(subjects)
      .where(eq(subjects.courseId, courseId))
      .orderBy(asc(subjects.semester), asc(subjects.code)),

    // All faculty for this course
    db
      .select({
        id: faculty.id,
        code: faculty.code,
        name: faculty.name,
        courseId: faculty.courseId,
      })
      .from(faculty)
      .where(eq(faculty.courseId, courseId))
      .orderBy(asc(faculty.code)),

    // All rooms (global, not course-scoped)
    db
      .select({
        id: rooms.id,
        name: rooms.name,
        isLab: rooms.isLab,
      })
      .from(rooms)
      .orderBy(asc(rooms.name)),

    // All assignments for subjects in this course (joined)
    db
      .select({
        id: assignments.id,
        subjectId: assignments.subjectId,
        classId: assignments.classId,
        facultyId: assignments.facultyId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        subjectShortCode: subjects.shortCode,
        subjectCredit: subjects.credit,
        subjectType: subjects.type,
        subjectSemester: subjects.semester,
        facultyCode: faculty.code,
        facultyName: faculty.name,
        className: classes.name,
      })
      .from(assignments)
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .innerJoin(faculty, eq(assignments.facultyId, faculty.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(subjects.courseId, courseId))
      .orderBy(asc(classes.semester), asc(subjects.code)),

    // All lab sessions for assignments in this course
    db
      .select({
        id: labSessions.id,
        assignmentId: labSessions.assignmentId,
        sessionType: labSessions.sessionType,
        roomId: labSessions.roomId,
        roomName: rooms.name,
        durationSlots: labSessions.durationSlots,
      })
      .from(labSessions)
      .innerJoin(assignments, eq(labSessions.assignmentId, assignments.id))
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .leftJoin(rooms, eq(labSessions.roomId, rooms.id))
      .where(eq(subjects.courseId, courseId))
      .orderBy(asc(labSessions.assignmentId), asc(labSessions.id)),

    // Specializations for display names
    db
      .select({
        id: specializations.id,
        name: specializations.name,
        shortCode: specializations.shortCode,
      })
      .from(specializations)
      .where(eq(specializations.courseId, courseId)),
  ]);

  // ─── 3. Build lookup maps ──────────────────────────────────────────
  const specMap = new Map(specRows.map((s) => [s.id, s]));

  // Group lab sessions by assignmentId
  const sessionsByAssignment = new Map<number, typeof labSessionRows>();
  for (const ls of labSessionRows) {
    const arr = sessionsByAssignment.get(ls.assignmentId) || [];
    arr.push(ls);
    sessionsByAssignment.set(ls.assignmentId, arr);
  }

  // ─── 4. Normalize classes ──────────────────────────────────────────
  const genClasses: GenClass[] = classRows.map((c) => {
    const spec = specMap.get(c.specializationId);
    return {
      id: c.id,
      name: c.name,
      year: c.year,
      semester: c.semester,
      divisionNumber: c.divisionNumber,
      courseId: c.courseId,
      specName: spec?.name || "",
      specShortCode: spec?.shortCode || "",
    };
  });

  // ─── 5. Normalize subjects ─────────────────────────────────────────
  const genSubjects: GenSubject[] = subjectRows.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    shortCode: s.shortCode,
    credit: s.credit,
    type: s.type as GenSubject["type"],
    semester: s.semester,
    courseId: s.courseId,
  }));

  // ─── 6. Normalize faculty ──────────────────────────────────────────
  const genFaculties: GenFaculty[] = facultyRows.map((f) => ({
    id: f.id,
    code: f.code,
    name: f.name,
    courseId: f.courseId,
  }));

  // ─── 7. Normalize rooms ───────────────────────────────────────────
  const genRooms: GenRoom[] = roomRows.map((r) => ({
    id: r.id,
    name: r.name,
    isLab: r.isLab,
  }));

  // ─── 8. Normalize lab sessions ─────────────────────────────────────
  const genLabSessions: GenLabSession[] = labSessionRows.map((ls) => ({
    id: ls.id,
    assignmentId: ls.assignmentId,
    sessionType: ls.sessionType as "Theory" | "Lab",
    roomId: ls.roomId,
    roomName: ls.roomName,
    durationSlots: ls.durationSlots,
  }));

  // ─── 9. Build lecture requirements with derived fields ─────────────
  const errors: GenerationValidationError[] = [];
  const warnings: GenerationValidationError[] = [];

  const genAssignments: GenLectureRequirement[] = assignmentRows.map((a) => {
    const sessions = sessionsByAssignment.get(a.id) || [];
    const labTypeSessions = sessions.filter((s) => s.sessionType === "Lab");
    const theoryTypeSessions = sessions.filter((s) => s.sessionType === "Theory");

    // ── Derived scheduling fields ──
    const labCount = labTypeSessions.length;
    // Use the most common lab duration (or 1 if no labs)
    const labDurationSlots =
      labCount > 0
        ? labTypeSessions[0].durationSlots
        : 1;
    const weeklyLabSlotConsumption = labCount * labDurationSlots;

    // Theory per week: derived from sessions if configured, otherwise from credits
    let theoryPerWeek: number;
    if (sessions.length > 0) {
      // Lab sessions are configured — derive theory count
      theoryPerWeek = theoryTypeSessions.length;
    } else {
      // No sessions configured — all credits are theory
      if (a.subjectType === "Theory") {
        theoryPerWeek = a.subjectCredit;
      } else if (a.subjectType === "Practical") {
        theoryPerWeek = 0;
      } else {
        // "Both" — assume all theory if not configured
        theoryPerWeek = a.subjectCredit;
      }
    }

    const totalWeeklySlots = theoryPerWeek + weeklyLabSlotConsumption;
    const isLabSubject = labCount > 0;
    const hasMultiSlotLab = labTypeSessions.some((s) => s.durationSlots > 1);

    // Preferred lab: the room_id from lab sessions (SC-10)
    const labRoomIds = [
      ...new Set(
        labTypeSessions
          .filter((s) => s.roomId !== null)
          .map((s) => s.roomId as number)
      ),
    ];
    const preferredLabId = labRoomIds.length > 0 ? labRoomIds[0] : null;

    // ── Validation ──
    const needsLabConfig =
      a.subjectType === "Practical" ||
      a.subjectType === "Both" ||
      a.subjectType === "ProjectMinor" ||
      a.subjectType === "ProjectMajor";

    if (needsLabConfig && sessions.length === 0) {
      warnings.push({
        type: "missing_lab_config",
        assignmentId: a.id,
        classId: a.classId,
        subjectId: a.subjectId,
        message: `${a.subjectShortCode} (${a.className}): No lab sessions configured for ${a.subjectType} subject`,
      });
    }

    if (sessions.length > 0 && sessions.length !== a.subjectCredit) {
      errors.push({
        type: "incomplete_credits",
        assignmentId: a.id,
        classId: a.classId,
        subjectId: a.subjectId,
        message: `${a.subjectShortCode} (${a.className}): Session count (${sessions.length}) ≠ subject credits (${a.subjectCredit})`,
      });
    }

    if (isLabSubject && !preferredLabId) {
      warnings.push({
        type: "missing_lab_config",
        assignmentId: a.id,
        classId: a.classId,
        subjectId: a.subjectId,
        message: `${a.subjectShortCode} (${a.className}): Lab sessions exist but no room assigned`,
      });
    }

    if (totalWeeklySlots <= 0) {
      errors.push({
        type: "invalid_requirement",
        assignmentId: a.id,
        classId: a.classId,
        subjectId: a.subjectId,
        message: `${a.subjectShortCode} (${a.className}): Total weekly slots is 0`,
      });
    }

    return {
      assignmentId: a.id,
      classId: a.classId,
      className: a.className,
      subjectId: a.subjectId,
      subjectCode: a.subjectCode,
      subjectShortCode: a.subjectShortCode,
      subjectName: a.subjectName,
      subjectCredit: a.subjectCredit,
      subjectType: a.subjectType,
      facultyId: a.facultyId,
      facultyCode: a.facultyCode,
      facultyName: a.facultyName,
      semester: a.subjectSemester,
      theoryPerWeek,
      labCount,
      labDurationSlots,
      weeklyLabSlotConsumption,
      totalWeeklySlots,
      isLabSubject,
      hasMultiSlotLab,
      preferredLabId,
      assignedLabIds: labRoomIds,
    };
  });

  // ─── 10. Check for classes without any assignments ──────────────────
  const classIdsWithAssignments = new Set(
    assignmentRows.map((a) => a.classId)
  );
  for (const cls of classRows) {
    if (!classIdsWithAssignments.has(cls.id)) {
      warnings.push({
        type: "missing_faculty",
        classId: cls.id,
        message: `Class ${cls.name}: No assignments found`,
      });
    }
  }

  // ─── 11. Check weekly slot capacity per class ──────────────────────
  const slotsByClass = new Map<number, number>();
  for (const req of genAssignments) {
    const current = slotsByClass.get(req.classId) || 0;
    slotsByClass.set(req.classId, current + req.totalWeeklySlots);
  }
  const maxWeeklySlots = DAYS_PER_WEEK * SLOTS_PER_DAY; // 30
  for (const [classId, total] of slotsByClass) {
    if (total > maxWeeklySlots) {
      const cls = classRows.find((c) => c.id === classId);
      errors.push({
        type: "invalid_requirement",
        classId,
        message: `Class ${cls?.name || classId}: Total weekly slots (${total}) exceeds capacity (${maxWeeklySlots})`,
      });
    }
  }

  // ─── 12. Assemble payload ──────────────────────────────────────────
  const metadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    courseId,
    courseName: course.name,
    daysPerWeek: DAYS_PER_WEEK,
    dayNames: DAY_NAMES,
    slotsPerDay: SLOTS_PER_DAY,
    breakAfterSlot: BREAK_AFTER_SLOT,
    breakGroups: BREAK_GROUPS,
    validLabWindows: VALID_LAB_WINDOWS,
  };

  return {
    metadata,
    classes: genClasses,
    subjects: genSubjects,
    faculties: genFaculties,
    rooms: genRooms,
    assignments: genAssignments,
    labSessions: genLabSessions,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
  };
}
