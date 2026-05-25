import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { divisions, counselorDivisionAssignments, students } from "@/app/lib/schema";
import { eq, and, count } from "drizzle-orm";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "counselor.divisions");
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;

    // Get divisions assigned to this counselor — scoped to each division's current semester
    const assigned = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        batchYear: divisions.batchYear,
        semesterNo: divisions.semesterNo,
      })
      .from(counselorDivisionAssignments)
      .innerJoin(divisions, and(
        eq(counselorDivisionAssignments.divisionId, divisions.id),
        eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
      ))
      .where(eq(counselorDivisionAssignments.facultyId, userId));

    // Add student counts
    const results = await Promise.all(
      assigned.map(async (div) => {
        const [studentCount] = await db
          .select({ total: count() })
          .from(students)
          .where(eq(students.currentDivisionId, div.id));
        
        return {
          ...div,
          studentCount: studentCount?.total ?? 0,
        };
      })
    );

    return ok(results);
  } catch (error) {
    console.error("[GET /api/counselor/divisions] Error:", error);
    return err("Internal server error", 500);
  }
}
