import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  attendanceSessionLedger,
  timetableEntries,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  students,
  divisions,
  semesters,
  faculty,
  subjects,
} from "@/app/lib/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { submitAttendanceCQRS } from "@/app/lib/integration/attendance-cqrs";
import { remember, cacheTags, TTL, clearCache } from "@/app/lib/cache";
import { AuditLogger } from "@/app/lib/audit-logger";

async function getDivisionAttendance(divisionId: number) {
  return remember(
    cacheTags.attendance.division(divisionId),
    TTL.ATTENDANCE,
    async () => {
      const rawSessions = await db
        .select({
          id: attendanceSessionLedger.id,
          date: attendanceSessionLedger.date,
          subjectName: subjects.name,
          facultyName: faculty.name,
          divisionName: divisions.displayName,
          startTime: attendanceSessionLedger.startTime,
          endTime: attendanceSessionLedger.endTime,
          absentStudentIds: attendanceSessionLedger.absentStudentIds,
        })
        .from(attendanceSessionLedger)
        .innerJoin(divisions, eq(attendanceSessionLedger.divisionId, divisions.id))
        .innerJoin(faculty, eq(attendanceSessionLedger.facultyId, faculty.id))
        .innerJoin(subjects, eq(attendanceSessionLedger.subjectId, subjects.id))
        .where(eq(attendanceSessionLedger.divisionId, divisionId));

      const [studentCountRow] = await db
        .select({ count: count() })
        .from(students)
        .where(eq(students.currentDivisionId, divisionId));
      const totalStudents = Number(studentCountRow?.count ?? 0);

      return {
        rawSessions,
        totalStudents,
      };
    }
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/attendance/sessions
 *
 * Fetch attendance sessions from ledger for a division + date (or the faculty's today schedule).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAnyPermission(req, ["attendance.mark", "attendance.view_division"]);
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole: resolvedRole } = auth;

    const dateParam = req.nextUrl.searchParams.get("date");
    const divisionIdParam = req.nextUrl.searchParams.get("divisionId");
    const today = new Date().toISOString().split("T")[0];
    const date = dateParam || today;

    // ── Faculty: Get today's timetable entries with session status from ledger ──
    if (resolvedRole === "faculty") {
      const entries = await db
        .select({
          timetableId: timetableEntries.id,
          dayOfWeek: timetableEntries.dayOfWeek,
          startTime: timetableEntries.startTime,
          endTime: timetableEntries.endTime,
          subjectName: subjects.name,
          facultyName: faculty.name,
          divisionName: divisions.displayName,
          divisionId: timetableEntries.divisionId,
          semesterId: timetableEntries.semesterId,
          assignmentId: timetableEntries.assignmentId,
          isLab: timetableEntries.isLab,
        })
        .from(timetableEntries)
        .innerJoin(
          facultySubjectAssignments,
          eq(facultySubjectAssignments.id, timetableEntries.assignmentId)
        )
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .innerJoin(divisions, eq(timetableEntries.divisionId, divisions.id))
        .where(eq(facultySubjectAssignments.facultyId, userId));

      const dayOfWeek = new Date(date + "T00:00:00")
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const todaysEntries = entries.filter(
        (e) => e.dayOfWeek.toLowerCase() === dayOfWeek
      );

      let existingSessions: { id: number; divisionId: number; startTime: string; endTime: string }[] = [];
      if (todaysEntries.length > 0) {
        existingSessions = await db
          .select({
            id: attendanceSessionLedger.id,
            divisionId: attendanceSessionLedger.divisionId,
            startTime: attendanceSessionLedger.startTime,
            endTime: attendanceSessionLedger.endTime,
          })
          .from(attendanceSessionLedger)
          .where(
            and(
              eq(attendanceSessionLedger.date, date),
              sql`(${attendanceSessionLedger.divisionId}, ${attendanceSessionLedger.startTime}, ${attendanceSessionLedger.endTime}) IN (${
                sql.join(
                  todaysEntries.map(e => sql`(${e.divisionId}, ${e.startTime}, ${e.endTime})`),
                  sql`, `
                )
              })`
            )
          );
      }

      const sessionMap = new Map(
        existingSessions.map((s) => [`${s.divisionId}_${s.startTime}_${s.endTime}`, s])
      );

      const slots = todaysEntries.map((entry) => {
        const session = sessionMap.get(`${entry.divisionId}_${entry.startTime}_${entry.endTime}`);
        return {
          timetableId: entry.timetableId,
          startTime: entry.startTime,
          endTime: entry.endTime,
          subjectName: entry.subjectName,
          divisionName: entry.divisionName,
          divisionId: entry.divisionId,
          semesterId: entry.semesterId,
          isLab: entry.isLab,
          sessionId: session?.id ?? null,
          sessionExists: !!session,
          isCancelled: false,
        };
      });

      return ok({ role: "faculty", date, slots });
    }

    // ── Counselor / HOD: Browse sessions by division + date ──
    if (resolvedRole === "counselor" || resolvedRole === "hod") {
      let availableDivisions: { id: number; displayName: string; semesterId: number }[];

      if (resolvedRole === "hod") {
        availableDivisions = await db
          .select({
            id: divisions.id,
            displayName: divisions.displayName,
            semesterId: divisions.semesterId,
          })
          .from(divisions)
          .innerJoin(semesters, eq(semesters.id, divisions.semesterId))
          .where(eq(semesters.isActive, true));
      } else {
        const assignments = await db
          .select({
            divisionId: counselorDivisionAssignments.divisionId,
            divisionName: divisions.displayName,
            semesterId: counselorDivisionAssignments.semesterId,
          })
          .from(counselorDivisionAssignments)
          .innerJoin(divisions, eq(counselorDivisionAssignments.divisionId, divisions.id))
          .where(eq(counselorDivisionAssignments.facultyId, userId));

        if (assignments.length === 0) {
          return ok({ role: resolvedRole, divisions: [], sessions: [] });
        }

        const divIds = assignments.map((a) => a.divisionId);
        availableDivisions = await db
          .select({
            id: divisions.id,
            displayName: divisions.displayName,
            semesterId: divisions.semesterId,
          })
          .from(divisions)
          .where(sql`${divisions.id} IN (${sql.join(divIds.map((id) => sql`${id}`), sql`, `)})`);
      }

      let sessions: {
        id: number;
        timetableId: number | null;
        date: string;
        subjectName: string;
        facultyName: string;
        divisionName: string;
        isCancelled: boolean;
        startTime: string;
        endTime: string;
        totalStudents: number;
        presentCount: number;
      }[] = [];

      if (divisionIdParam) {
        const divId = parseInt(divisionIdParam, 10);
        if (isNaN(divId)) return err("Invalid divisionId", 400);

        if (
          resolvedRole === "counselor" &&
          !availableDivisions.some((d) => d.id === divId)
        ) {
          return err("Forbidden: not assigned to this division", 403);
        }

        const cached = await getDivisionAttendance(divId);
        const filtered = cached.rawSessions.filter((s) => s.date === date);

        for (const s of filtered) {
          sessions.push({
            id: s.id,
            timetableId: null,
            date: s.date,
            subjectName: s.subjectName,
            facultyName: s.facultyName,
            divisionName: s.divisionName,
            isCancelled: false,
            startTime: s.startTime,
            endTime: s.endTime,
            totalStudents: cached.totalStudents,
            presentCount: Math.max(0, cached.totalStudents - s.absentStudentIds.length),
          });
        }
      }

      return ok({
        role: resolvedRole,
        date,
        divisions: availableDivisions,
        sessions,
      });
    }

    return err("Forbidden: attendance not available for this role via this endpoint", 403);
  } catch (error) {
    console.error("[GET /api/attendance/sessions]", error);
    return err("Internal server error", 500);
  }
}

/**
 * POST /api/attendance/sessions
 *
 * Create a new attendance session ledger entry (or return existing one).
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "attendance.mark");
  if (auth instanceof NextResponse) return auth;

  const audit = AuditLogger.start(req, auth, {
    action: "attendance_session.create",
    category: "attendance",
    summary: "Created attendance session",
  });

  try {
    const { userId, activeRole: resolvedRole } = auth;

    const body = await req.json();
    const { timetableEntryId, date } = body;

    if (!timetableEntryId || !date) {
      return audit.error("timetableEntryId and date are required", undefined, 400);
    }

    // Validate timetable entry exists
    const [entry] = await db
      .select({
        id: timetableEntries.id,
        divisionId: timetableEntries.divisionId,
        semesterId: timetableEntries.semesterId,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        assignmentId: timetableEntries.assignmentId,
      })
      .from(timetableEntries)
      .where(eq(timetableEntries.id, timetableEntryId))
      .limit(1);

    if (!entry) return audit.error("Timetable entry not found", undefined, 404);

    const [entryDetails] = await db
      .select({
        facultyId: facultySubjectAssignments.facultyId,
        subjectId: subjects.id,
      })
      .from(timetableEntries)
      .innerJoin(
        facultySubjectAssignments,
        eq(facultySubjectAssignments.id, timetableEntries.assignmentId)
      )
      .innerJoin(subjects, eq(subjects.id, facultySubjectAssignments.subjectId))
      .where(eq(timetableEntries.id, timetableEntryId))
      .limit(1);

    if (!entryDetails) return audit.error("Assignment details not found", undefined, 404);

    // RBAC: Faculty must own the assignment
    if (resolvedRole === "faculty" && entryDetails.facultyId !== userId) {
      return audit.error("Forbidden: not assigned to this subject", undefined, 403);
    }

    // RBAC: Counselor must own the division
    if (resolvedRole === "counselor") {
      const counselorAssignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .where(eq(counselorDivisionAssignments.facultyId, userId));

      if (!counselorAssignments.some((a) => a.divisionId === entry.divisionId)) {
        return audit.error("Forbidden: not assigned to this division", undefined, 403);
      }
    }

    // Check for existing ledger entry
    const [existing] = await db
      .select({
        id: attendanceSessionLedger.id,
        absentStudentIds: attendanceSessionLedger.absentStudentIds,
      })
      .from(attendanceSessionLedger)
      .where(
        and(
          eq(attendanceSessionLedger.divisionId, entry.divisionId),
          eq(attendanceSessionLedger.semesterId, entry.semesterId),
          eq(attendanceSessionLedger.date, date),
          eq(attendanceSessionLedger.startTime, entry.startTime),
          eq(attendanceSessionLedger.endTime, entry.endTime)
        )
      )
      .limit(1);

    const studentsInDivision = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.currentDivisionId, entry.divisionId));

    if (existing) {
      const records = studentsInDivision.map((s) => ({
        studentId: s.id,
        status: existing.absentStudentIds.includes(s.id) ? "absent" : "present",
      }));
      return audit.success(ok({ sessionId: existing.id, isNew: false, records }), { eid: String(existing.id) });
    }

    // Create a new ledger session (everyone present by default)
    const newSessionId = await submitAttendanceCQRS({
      semesterId: entry.semesterId,
      divisionId: entry.divisionId,
      facultyId: entryDetails.facultyId,
      date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectId: entryDetails.subjectId,
      absentStudentIds: [],
    });

    await clearCache(cacheTags.attendance.division(entry.divisionId));
    await clearCache(cacheTags.dashboard.division(entry.divisionId));

    const records = studentsInDivision.map((s) => ({
      studentId: s.id,
      status: "present",
    }));

    return audit.success(ok({ sessionId: newSessionId, isNew: true, records }), { eid: String(newSessionId) });
  } catch (error) {
    return audit.error(error);
  }
}
