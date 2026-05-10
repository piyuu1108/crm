import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  attendanceSessions,
  attendance,
  timetableEntries,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  students,
  divisions,
  semesters,
} from "@/app/lib/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

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
 * Fetch attendance sessions for a division + date (or the faculty's today schedule).
 *
 * Query params:
 *   - divisionId (required for counselor/hod)
 *   - date (YYYY-MM-DD, defaults to today)
 *   - mode: "faculty-today" | "browse" (defaults based on role)
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (rolesArray.length === 0) return err("Forbidden", 403);

    const activeRole =
      req.headers.get("X-Active-Role") ??
      req.nextUrl.searchParams.get("role") ??
      null;
    const ROLE_PRIORITY = ["hod", "counselor", "faculty", "student"];
    const resolvedRole = activeRole && rolesArray.includes(activeRole)
      ? activeRole
      : ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

    const dateParam = req.nextUrl.searchParams.get("date");
    const divisionIdParam = req.nextUrl.searchParams.get("divisionId");
    const today = new Date().toISOString().split("T")[0];
    const date = dateParam || today;

    // ── Faculty: Get today's timetable entries with session status ──
    if (resolvedRole === "faculty") {
      // Get all timetable entries for this faculty
      const entries = await db
        .select({
          timetableId: timetableEntries.id,
          dayOfWeek: timetableEntries.dayOfWeek,
          startTime: timetableEntries.startTime,
          endTime: timetableEntries.endTime,
          subjectName: timetableEntries.subjectName,
          facultyName: timetableEntries.facultyName,
          divisionName: timetableEntries.divisionName,
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
        .where(eq(facultySubjectAssignments.facultyId, payload.userId));

      // Filter by day of week for the selected date
      const dayOfWeek = new Date(date + "T00:00:00")
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const todaysEntries = entries.filter(
        (e) => e.dayOfWeek.toLowerCase() === dayOfWeek
      );

      // Check which sessions already exist for this date
      const timetableIds = todaysEntries.map((e) => e.timetableId);
      let existingSessions: { id: number; timetableId: number | null; isCancelled: boolean }[] = [];
      if (timetableIds.length > 0) {
        existingSessions = await db
          .select({
            id: attendanceSessions.id,
            timetableId: attendanceSessions.timetableId,
            isCancelled: attendanceSessions.isCancelled,
          })
          .from(attendanceSessions)
          .where(
            and(
              sql`${attendanceSessions.timetableId} IN (${sql.join(timetableIds.map((id) => sql`${id}`), sql`, `)})`,
              eq(attendanceSessions.date, date)
            )
          );
      }

      const sessionMap = new Map(existingSessions.map((s) => [s.timetableId, s]));

      const slots = todaysEntries.map((entry) => {
        const session = sessionMap.get(entry.timetableId);
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
          isCancelled: session?.isCancelled ?? false,
        };
      });

      return ok({ role: "faculty", date, slots });
    }

    // ── Counselor / HOD: Browse sessions by division + date ──
    if (resolvedRole === "counselor" || resolvedRole === "hod") {
      // Get available divisions
      let availableDivisions: { id: number; displayName: string; semesterId: number }[];

      if (resolvedRole === "hod") {
        // HOD sees all divisions in active semesters
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
        // Counselor sees only assigned divisions
        const assignments = await db
          .select({
            divisionId: counselorDivisionAssignments.divisionId,
            divisionName: counselorDivisionAssignments.divisionName,
            semesterId: counselorDivisionAssignments.semesterId,
          })
          .from(counselorDivisionAssignments)
          .where(eq(counselorDivisionAssignments.facultyId, payload.userId));

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

      // If a specific division is selected, fetch its sessions
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

        // Validate access
        if (
          resolvedRole === "counselor" &&
          !availableDivisions.some((d) => d.id === divId)
        ) {
          return err("Forbidden: not assigned to this division", 403);
        }

        const rawSessions = await db
          .select({
            id: attendanceSessions.id,
            timetableId: attendanceSessions.timetableId,
            date: attendanceSessions.date,
            subjectName: attendanceSessions.subjectName,
            facultyName: attendanceSessions.facultyName,
            divisionName: attendanceSessions.divisionName,
            isCancelled: attendanceSessions.isCancelled,
            startTime: attendanceSessions.startTime,
            endTime: attendanceSessions.endTime,
          })
          .from(attendanceSessions)
          .where(
            and(
              eq(attendanceSessions.divisionId, divId),
              eq(attendanceSessions.date, date)
            )
          );

        // Get counts for each session
        for (const s of rawSessions) {
          const counts = await db
            .select({
              total: sql<number>`count(*)`,
              present: sql<number>`count(*) filter (where ${attendance.status} = 'present')`,
            })
            .from(attendance)
            .where(eq(attendance.attendanceSessionId, s.id));

          sessions.push({
            ...s,
            totalStudents: Number(counts[0]?.total ?? 0),
            presentCount: Number(counts[0]?.present ?? 0),
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
 * Create a new attendance session (or return existing one).
 * Body: { timetableEntryId, date }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    const activeRole =
      req.headers.get("X-Active-Role") ??
      null;
    const ROLE_PRIORITY = ["hod", "counselor", "faculty"];
    const resolvedRole = activeRole && rolesArray.includes(activeRole)
      ? activeRole
      : ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const body = await req.json();
    const { timetableEntryId, date } = body;

    if (!timetableEntryId || !date) {
      return err("timetableEntryId and date are required", 400);
    }

    // Validate timetable entry exists
    const [entry] = await db
      .select({
        id: timetableEntries.id,
        divisionId: timetableEntries.divisionId,
        semesterId: timetableEntries.semesterId,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        subjectName: timetableEntries.subjectName,
        facultyName: timetableEntries.facultyName,
        divisionName: timetableEntries.divisionName,
        assignmentId: timetableEntries.assignmentId,
      })
      .from(timetableEntries)
      .where(eq(timetableEntries.id, timetableEntryId))
      .limit(1);

    if (!entry) return err("Timetable entry not found", 404);

    // RBAC: Faculty must own the assignment
    if (resolvedRole === "faculty") {
      const [assignment] = await db
        .select({ facultyId: facultySubjectAssignments.facultyId })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.id, entry.assignmentId))
        .limit(1);

      if (!assignment || assignment.facultyId !== payload.userId) {
        return err("Forbidden: not assigned to this subject", 403);
      }
    }

    // RBAC: Counselor must own the division
    if (resolvedRole === "counselor") {
      const counselorAssignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .where(eq(counselorDivisionAssignments.facultyId, payload.userId));

      if (!counselorAssignments.some((a) => a.divisionId === entry.divisionId)) {
        return err("Forbidden: not assigned to this division", 403);
      }
    }

    // Check for existing session
    const [existing] = await db
      .select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.timetableId, timetableEntryId),
          eq(attendanceSessions.date, date)
        )
      )
      .limit(1);

    if (existing) {
      // Return existing session with its records
      const records = await db
        .select({
          studentId: attendance.studentId,
          status: attendance.status,
        })
        .from(attendance)
        .where(eq(attendance.attendanceSessionId, existing.id));

      return ok({ sessionId: existing.id, isNew: false, records });
    }

    // Create new session
    const [newSession] = await db
      .insert(attendanceSessions)
      .values({
        timetableId: timetableEntryId,
        semesterId: entry.semesterId,
        divisionId: entry.divisionId,
        date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        subjectName: entry.subjectName,
        facultyName: entry.facultyName,
        divisionName: entry.divisionName,
        markedByFacultyId: payload.userId,
      })
      .returning({ id: attendanceSessions.id });

    return ok({ sessionId: newSession.id, isNew: true, records: [] });
  } catch (error) {
    console.error("[POST /api/attendance/sessions]", error);
    return err("Internal server error", 500);
  }
}
