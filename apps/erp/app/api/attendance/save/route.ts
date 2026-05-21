import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  attendanceSessionLedger,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { submitAttendanceCQRS } from "@/app/lib/integration/attendance-cqrs";
import { cacheTags, clearCache } from "@/app/lib/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * POST /api/attendance/save
 *
 * Batch save attendance changes for a session ledger.
 * Body: { sessionId, records: [{ studentId, status }] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return err("Unauthorized", 401);

    const { userId, roles: rolesArray, activeRole: resolvedRole, isRoleForbidden, forbiddenRole } = auth;

    if (isRoleForbidden) {
      return err(`Forbidden: role '${forbiddenRole}' is not assigned to this user`, 403);
    }

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const body = await req.json();
    const { sessionId, records } = body;

    if (!sessionId || !Array.isArray(records) || records.length === 0) {
      return err("sessionId and non-empty records array are required", 400);
    }

    // Validate records
    for (const r of records) {
      if (!r.studentId || !["present", "absent"].includes(r.status)) {
        return err("Each record must have studentId and status (present|absent)", 400);
      }
    }

    // Fetch existing ledger session
    const [session] = await db
      .select({
        id: attendanceSessionLedger.id,
        semesterId: attendanceSessionLedger.semesterId,
        divisionId: attendanceSessionLedger.divisionId,
        facultyId: attendanceSessionLedger.facultyId,
        date: attendanceSessionLedger.date,
        startTime: attendanceSessionLedger.startTime,
        endTime: attendanceSessionLedger.endTime,
        subjectName: attendanceSessionLedger.subjectName,
        absentStudentIds: attendanceSessionLedger.absentStudentIds,
      })
      .from(attendanceSessionLedger)
      .where(eq(attendanceSessionLedger.id, sessionId))
      .limit(1);

    if (!session) return err("Session not found", 404);

    // RBAC: Faculty must own the assignment
    if (resolvedRole === "faculty" && session.facultyId !== userId) {
      return err("Forbidden: not assigned to this subject", 403);
    }

    // RBAC: Counselor must own the division
    if (resolvedRole === "counselor") {
      const counselorAssignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .where(eq(counselorDivisionAssignments.facultyId, userId));

      if (!counselorAssignments.some((a) => a.divisionId === session.divisionId)) {
        return err("Forbidden: not assigned to this division", 403);
      }
    }

    // Resolve the full list of absent student IDs by applying incoming diffs to the existing array
    const absentSet = new Set(session.absentStudentIds);
    for (const r of records) {
      if (r.status === "absent") {
        absentSet.add(r.studentId);
      } else {
        absentSet.delete(r.studentId);
      }
    }
    const updatedAbsentIds = Array.from(absentSet);

    await submitAttendanceCQRS({
      semesterId: session.semesterId,
      divisionId: session.divisionId,
      facultyId: userId, // use current user saving the attendance
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      subjectName: session.subjectName,
      absentStudentIds: updatedAbsentIds,
    });

    await clearCache(cacheTags.attendance.division(session.divisionId));
    await clearCache(cacheTags.dashboard.division(session.divisionId));

    return ok({ saved: records.length });
  } catch (error) {
    console.error("[POST /api/attendance/save]", error);
    return err("Internal server error", 500);
  }
}
