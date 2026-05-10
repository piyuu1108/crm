import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { verifyToken } from "@/app/lib/auth";
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

async function authorizeCounselor() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("counselor")) {
    return { error: err("Forbidden: Counselor access required", 403) };
  }

  return { payload };
}

async function ensureDivisionAccess(counselorId: number, divisionId: number) {
  // Verify assignment — scoped to the division's current semester
  const assignment = await db
    .select({ id: counselorDivisionAssignments.id })
    .from(counselorDivisionAssignments)
    .innerJoin(divisions, and(
      eq(counselorDivisionAssignments.divisionId, divisions.id),
      eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
    ))
    .where(
      and(
        eq(counselorDivisionAssignments.facultyId, counselorId),
        eq(counselorDivisionAssignments.divisionId, divisionId)
      )
    )
    .limit(1);

  return Boolean(assignment[0]);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await authorizeCounselor();
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

    const allowed = await ensureDivisionAccess(
      auth.payload.userId,
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
    const auth = await authorizeCounselor();
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

    const allowed = await ensureDivisionAccess(
      auth.payload.userId,
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
