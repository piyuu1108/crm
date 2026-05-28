import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { requirePermission, AuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  students,
  divisions,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { cacheTags, clearCache } from "@/app/lib/cache";
import { publishNotification } from "@/app/lib/notifications";
import { AuditLogger } from "@/app/lib/audit-logger";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function ensureDivisionAccess(auth: AuthContext, divisionId: number) {
  const counselorDivisionIds = auth.counselorDivisionIds ?? [];
  return counselorDivisionIds.includes(divisionId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await requirePermission(req, "counselor.students");
    if (auth instanceof NextResponse) return auth;

    const { studentId } = await params;
    const id = Number(studentId);
    if (Number.isNaN(id) || id <= 0) return err("Invalid student ID", 400);

    const rows = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        fullName: students.fullName,
        email: students.email,
        mobile: students.mobile,
        parentMobile: students.parentMobile,
        status: students.status,
        profileStatus: students.profileStatus,
        profileStep: students.profileStep,
        currentDivisionId: students.currentDivisionId,
        currentDivisionName: students.currentDivisionName,
        currentSemesterNo: students.currentSemesterNo,
      })
      .from(students)
      .where(eq(students.id, id))
      .limit(1);

    const student = rows[0];
    if (!student) return err("Student not found", 404);
    if (!student.currentDivisionId) return err("Student has no active division", 400);

    const allowed = ensureDivisionAccess(
      auth,
      student.currentDivisionId
    );
    if (!allowed) return err("Forbidden: student not in your assigned division", 403);

    return ok(student);
  } catch (error) {
    console.error("[GET /api/counselor/students/[studentId]] Error:", error);
    return err("Internal server error", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requirePermission(req, "counselor.students");
  if (auth instanceof NextResponse) return auth;

  const { studentId } = await params;
  const id = Number(studentId);

  // Read body before starting audit to get action
  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    // Ignore error, hand it to logic
  }
  const action = body?.action as string | undefined;

  const audit = AuditLogger.start(req, auth, {
    action: action ? `counselor_student.${action}` : "counselor_student.update",
    category: "counselor",
    summary: action ? `Profile ${action} by counselor` : "Edited profile by counselor",
    entityId: isNaN(id) ? undefined : id,
  });

  try {
    if (Number.isNaN(id) || id <= 0) return audit.error("Invalid student ID", err("Invalid student ID", 400));

    const rows = await db
      .select({
        id: students.id,
        currentDivisionId: students.currentDivisionId,
      })
      .from(students)
      .where(eq(students.id, id))
      .limit(1);

    const student = rows[0];
    if (!student) return audit.error("Student not found", err("Student not found", 404));
    if (!student.currentDivisionId) return audit.error("Student has no active division", err("Student has no active division", 400));

    const allowed = ensureDivisionAccess(
      auth,
      student.currentDivisionId
    );
    if (!allowed) return audit.error("Forbidden: student not in your assigned division", err("Forbidden: student not in your assigned division", 403));

    if (action) {
      if (action !== "approve" && action !== "reject") {
        return audit.error("Invalid action. Must be 'approve' or 'reject'", err("Invalid action. Must be 'approve' or 'reject'", 400));
      }

      const nextStatus = action === "approve" ? "approved" : "rejected";
      await db.update(students).set({ status: nextStatus }).where(eq(students.id, id));

      publishNotification({
        title: action === "approve" ? "Profile Approved" : "Profile Rejected",
        message: action === "approve"
          ? "Your profile has been approved by your counselor."
          : "Your profile was rejected. Please review your details and re-submit.",
        notificationType: "counselor_action",
        receiverUserId: id,
        receiverRole: "student",
        priority: action === "approve" ? "medium" : "high",
        createdBy: auth.userId,
        relatedEntityType: "students",
        relatedEntityId: id,
      });

      try {
        await clearCache(cacheTags.dashboard.user(id));
      } catch (cacheError) {
        console.warn("[counselor student verify] cache clear failed:", cacheError);
      }

      return audit.success(ok({ id, status: nextStatus }));
    }

    // Otherwise, edit profile (fullName, email)
    const { fullName, email } = body || {};
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return audit.error("Full name is required", err("Full name is required", 400));
    }
    if (!email || typeof email !== "string" || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim())) {
      return audit.error("A valid email address is required", err("A valid email address is required", 400));
    }

    // Check email uniqueness
    const emailConflict = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.email, email.trim()), ne(students.id, id)))
      .limit(1);
    if (emailConflict[0]) {
      return audit.error("Email is already in use by another student", err("Email is already in use by another student", 400));
    }

    await db
      .update(students)
      .set({
        fullName: fullName.trim(),
        email: email.trim(),
      })
      .where(eq(students.id, id));

    try {
      await clearCache(cacheTags.dashboard.user(id));
    } catch (cacheError) {
      console.warn("[counselor student update] cache clear failed:", cacheError);
    }

    return audit.success(ok({ id, fullName: fullName.trim(), email: email.trim() }));
  } catch (error) {
    return audit.error(error);
  }
}
