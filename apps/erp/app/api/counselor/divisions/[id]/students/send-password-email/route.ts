import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { counselorDivisionAssignments, divisions, students } from "@/app/lib/schema";
import { sendPasswordEmail } from "@/app/lib/email/service";

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
  try {
    const { id: idStr } = await params;
    const divisionId = Number.parseInt(idStr, 10);
    if (!Number.isFinite(divisionId)) return err("Invalid division ID", 400);

    const auth = await requirePermission(req, "counselor.email");
    if (auth instanceof NextResponse) return auth;

    const counselorDivisionIds = auth.counselorDivisionIds ?? [];
    if (!counselorDivisionIds.includes(divisionId)) return err("Forbidden", 403);

    const body = (await req.json().catch(() => ({}))) as { studentDbId?: number };
    const studentDbId = Number(body.studentDbId);
    if (!Number.isFinite(studentDbId)) return err("studentDbId is required", 400);

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

    if (!student) return err("Student not found in this division", 404);
    if (!student.studentId) return err("Student ID is not assigned", 400);
    if (!student.email) return err("Student has no email address", 400);

    console.log(`[counselor send-password-email] Sending to studentId=${student.studentId} dbId=${student.id}`);

    // FIXED: pass the correct payload shape that matches PasswordEmailPayload
    const result = await sendPasswordEmail({
      userId: student.id,
      userCode: student.studentId,
      fullName: student.fullName,
      email: student.email,
      userType: "student",
    });

    if (!result.success) {
      console.error("[counselor send-password-email] Failed:", result.error);
      return err(result.error ?? "Failed to send password email", 500);
    }

    console.log(`[counselor send-password-email] Sent successfully to ${student.email}`);
    return ok({ sent: true });
  } catch (error) {
    console.error("[POST counselor single password email] Error:", error);
    return err("Internal server error", 500);
  }
}
