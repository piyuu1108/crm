import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { students } from "@/app/lib/schema";
import { invalidateDashboard } from "@/app/lib/cache";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorizeHod(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await authorizeHod(req);
    if ("error" in auth && auth.error) return auth.error;

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
        currentDivisionName: students.currentDivisionName,
        currentSemesterNo: students.currentSemesterNo,
      })
      .from(students)
      .where(eq(students.id, id))
      .limit(1);

    if (!rows[0]) return err("Student not found", 404);
    return ok(rows[0]);
  } catch (error) {
    console.error("[GET /api/admin/students/[studentId]] Error:", error);
    return err("Internal server error", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await authorizeHod(req);
    if ("error" in auth && auth.error) return auth.error;

    const { studentId } = await params;
    const id = Number(studentId);
    if (Number.isNaN(id) || id <= 0) return err("Invalid student ID", 400);

    const body = await req.json();
    const action = body?.action as string | undefined;
    if (action !== "approve" && action !== "reject") {
      return err("Invalid action. Must be 'approve' or 'reject'", 400);
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";

    const existing = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, id))
      .limit(1);
    if (!existing[0]) return err("Student not found", 404);

    await db
      .update(students)
      .set({ status: nextStatus })
      .where(eq(students.id, id));

    try {
      await invalidateDashboard(id);
    } catch (cacheError) {
      console.warn("[admin student verify] cache clear failed:", cacheError);
    }

    return ok({ id, status: nextStatus });
  } catch (error) {
    console.error("[PATCH /api/admin/students/[studentId]] Error:", error);
    return err("Internal server error", 500);
  }
}
