import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { divisions, students, counselorDivisionAssignments } from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const divisionId = parseInt(idStr, 10);
    if (isNaN(divisionId)) return err("Invalid ID", 400);

    const auth = await requirePermission(req, "counselor.divisions");
    if (auth instanceof NextResponse) return auth;

    const counselorDivisionIds = auth.counselorDivisionIds ?? [];
    if (!counselorDivisionIds.includes(divisionId)) {
      return err("Forbidden: You are not the counselor for this division in its current semester", 403);
    }

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
