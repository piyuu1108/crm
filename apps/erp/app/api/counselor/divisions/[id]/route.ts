import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { divisions, students, counselorDivisionAssignments } from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorize(divisionId: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("counselor")) {
    return { error: err("Forbidden", 403) };
  }

  // Verify assignment — scoped to the division's current semester
  const [assignment] = await db
    .select({ id: counselorDivisionAssignments.id })
    .from(counselorDivisionAssignments)
    .innerJoin(divisions, and(
      eq(counselorDivisionAssignments.divisionId, divisions.id),
      eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
    ))
    .where(
      and(
        eq(counselorDivisionAssignments.facultyId, payload.userId),
        eq(counselorDivisionAssignments.divisionId, divisionId)
      )
    )
    .limit(1);

  if (!assignment) {
    return { error: err("Forbidden: You are not the counselor for this division in its current semester", 403) };
  }

  return { payload };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const divisionId = parseInt(idStr, 10);
    if (isNaN(divisionId)) return err("Invalid ID", 400);

    const auth = await authorize(divisionId);
    if ("error" in auth && auth.error) return auth.error;

    // Fetch division
    const [division] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, divisionId))
      .limit(1);

    if (!division) return err("Division not found", 404);

    // Students list
    const studentsList = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        fullName: students.fullName,
        email: students.email,
        status: students.status,
      })
      .from(students)
      .where(eq(students.currentDivisionId, divisionId))
      .orderBy(students.studentId);

    return ok({
      ...division,
      studentCount: studentsList.length,
      students: studentsList,
    });
  } catch (error) {
    console.error("[GET /api/counselor/divisions/[id]] Error:", error);
    return err("Internal server error", 500);
  }
}
