import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { divisions, counselorDivisionAssignments, students } from "@/app/lib/schema";
import { eq, and, count } from "drizzle-orm";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorize() {
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

export async function GET() {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;
    const { userId } = auth.payload;

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
