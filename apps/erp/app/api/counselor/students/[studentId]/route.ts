import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthContext, AuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  students,
  divisions,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { redis } from "@/app/lib/redis";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorizeCounselor(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  if (!rolesArray.includes("counselor")) {
    return { error: err("Forbidden: Counselor access required", 403) };
  }

  return { payload: payload as AuthContext };
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
    const auth = await authorizeCounselor(req);
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
      auth.payload,
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
  try {
    const auth = await authorizeCounselor(req);
    if ("error" in auth && auth.error) return auth.error;

    const { studentId } = await params;
    const id = Number(studentId);
    if (Number.isNaN(id) || id <= 0) return err("Invalid student ID", 400);

    const body = await req.json();
    const action = body?.action as string | undefined;
    if (action !== "approve" && action !== "reject") {
      return err("Invalid action. Must be 'approve' or 'reject'", 400);
    }

    const rows = await db
      .select({
        id: students.id,
        currentDivisionId: students.currentDivisionId,
      })
      .from(students)
      .where(eq(students.id, id))
      .limit(1);

    const student = rows[0];
    if (!student) return err("Student not found", 404);
    if (!student.currentDivisionId) return err("Student has no active division", 400);

    const allowed = ensureDivisionAccess(
      auth.payload,
      student.currentDivisionId
    );
    if (!allowed) return err("Forbidden: student not in your assigned division", 403);

    const nextStatus = action === "approve" ? "approved" : "rejected";
    await db.update(students).set({ status: nextStatus }).where(eq(students.id, id));

    try {
      await redis.del(`dashboard:user:${id}:role:student`);
    } catch (cacheError) {
      console.warn("[counselor student verify] cache clear failed:", cacheError);
    }

    return ok({ id, status: nextStatus });
  } catch (error) {
    console.error("[PATCH /api/counselor/students/[studentId]] Error:", error);
    return err("Internal server error", 500);
  }
}
