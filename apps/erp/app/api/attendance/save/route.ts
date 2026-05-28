import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  attendanceSessionLedger,
  counselorDivisionAssignments,
  subjects,
} from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { submitAttendanceCQRS } from "@/app/lib/integration/attendance-cqrs";
import { cacheTags, clearCache } from "@/app/lib/cache";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { SaveAttendanceSchema } from "@/app/lib/validations/schemas/attendance";

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
  const auth = await requirePermission(req, "attendance.mark");
  if (auth instanceof NextResponse) return auth;

  const { userId, activeRole: resolvedRole } = auth;

  const audit = AuditLogger.start(req, auth, {
    action: "attendance.save",
    category: "attendance",
    summary: "Saved student attendance records",
    entityType: "attendance_ledger",
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, SaveAttendanceSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { sessionId, records } = parsed.data;

    const [session] = await db
      .select({
        id: attendanceSessionLedger.id,
        semesterId: attendanceSessionLedger.semesterId,
        divisionId: attendanceSessionLedger.divisionId,
        facultyId: attendanceSessionLedger.facultyId,
        date: attendanceSessionLedger.date,
        startTime: attendanceSessionLedger.startTime,
        endTime: attendanceSessionLedger.endTime,
        subjectId: attendanceSessionLedger.subjectId,
        absentStudentIds: attendanceSessionLedger.absentStudentIds,
      })
      .from(attendanceSessionLedger)
      .where(eq(attendanceSessionLedger.id, sessionId))
      .limit(1);

    if (!session) return audit.error("Session not found", undefined, 404);

    // RBAC: Faculty must own the assignment
    if (resolvedRole === "faculty" && session.facultyId !== userId) {
      return audit.error("Forbidden: not assigned to this subject", undefined, 403);
    }

    // RBAC: Counselor must own the division
    if (resolvedRole === "counselor") {
      const counselorAssignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .where(eq(counselorDivisionAssignments.facultyId, userId));

      if (!counselorAssignments.some((a) => a.divisionId === session.divisionId)) {
        return audit.error("Forbidden: not assigned to this division", undefined, 403);
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
      subjectId: session.subjectId,
      absentStudentIds: updatedAbsentIds,
    });

    await clearCache(cacheTags.attendance.division(session.divisionId));
    await clearCache(cacheTags.dashboard.division(session.divisionId));

    return audit.success(
      NextResponse.json({ success: true, data: { saved: records.length } }),
      {
        eid: String(sessionId),
        recs: records.length,
        did: String(session.divisionId),
        sub: String(session.subjectId),
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
