import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { divisions, students, counselorDivisionAssignments } from "@/app/lib/schema";
import { eq, count, sql } from "drizzle-orm";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
async function authorize() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid or expired session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── GET /api/admin/divisions/[id] — Division detail with students ────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return err("Invalid division ID", 400);

    // Fetch division
    const [division] = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        batchYear: divisions.batchYear,
        semesterNo: divisions.semesterNo,
        divisionNo: divisions.divisionNo,
        courseCode: divisions.courseCode,
        courseName: divisions.courseName,
        maxCapacity: divisions.maxCapacity,
        createdAt: divisions.createdAt,
      })
      .from(divisions)
      .where(eq(divisions.id, id))
      .limit(1);

    if (!division) return err("Division not found", 404);

    // Student count
    const [countResult] = await db
      .select({ total: count() })
      .from(students)
      .where(eq(students.currentDivisionId, id));

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
      .where(eq(students.currentDivisionId, id))
      .orderBy(students.studentId);

    // Counselor for this division
    const counselors = await db
      .select({
        facultyName: counselorDivisionAssignments.facultyName,
      })
      .from(counselorDivisionAssignments)
      .where(eq(counselorDivisionAssignments.divisionId, id));

    return ok({
      ...division,
      studentCount: countResult?.total ?? 0,
      counselorName: counselors[0]?.facultyName || null,
      students: studentsList,
    });
  } catch (error) {
    console.error("[GET /api/admin/divisions/[id]] Error:", error);
    return err("Internal server error", 500);
  }
}
