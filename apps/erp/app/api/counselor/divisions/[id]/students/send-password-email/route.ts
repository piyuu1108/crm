import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { counselorDivisionAssignments, divisions, students } from "@/app/lib/schema";
import { sendPasswordEmail } from "@/app/lib/email/service";
import { AuditLogger } from "@/app/lib/audit-logger";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "counselor.email");
  if (auth instanceof NextResponse) return auth;

  const { id: idStr } = await params;
  const divisionId = Number.parseInt(idStr, 10);

  const audit = AuditLogger.start(req, auth, {
    action: "counselor.send_password_email",
    category: "counselor",
    summary: "Sent setup password email to student",
    entityType: "student",
  });

  try {
    if (!Number.isFinite(divisionId)) return audit.error("Invalid division ID", undefined, 400);

    const counselorDivisionIds = auth.counselorDivisionIds ?? [];
    if (!counselorDivisionIds.includes(divisionId)) return audit.error("Forbidden", undefined, 403);

    const body = (await req.json().catch(() => ({}))) as { studentDbId?: number };
    const studentDbId = Number(body.studentDbId);
    if (!Number.isFinite(studentDbId)) return audit.error("studentDbId is required", undefined, 400);

    const [student] = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        fullName: students.fullName,
        email: students.email,
      })
      .from(students)
      .where(
        and(eq(students.id, studentDbId), eq(students.currentDivisionId, divisionId))
      )
      .limit(1);

    if (!student) return audit.error("Student not found in this division", undefined, 404);
    if (!student.studentId) return audit.error("Student ID is not assigned", undefined, 400);
    if (!student.email) return audit.error("Student has no email address", undefined, 400);

    // FIXED: pass the correct payload shape that matches PasswordEmailPayload
    const result = await sendPasswordEmail({
      userId: student.id,
      userCode: student.studentId,
      fullName: student.fullName,
      email: student.email,
      userType: "student",
    });

    if (!result.success) {
      return audit.error(result.error ?? "Failed to send password email", undefined, 500);
    }

    return audit.success(
      NextResponse.json({ success: true, data: { sent: true } }, { status: 200 }),
      {
        eid: String(student.id),
        email: student.email,
        did: String(divisionId),
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
