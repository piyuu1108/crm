import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { students, counselorDivisionAssignments, semesters } from "@/app/lib/schema";
import { eq, and, sql, like } from "drizzle-orm";

// ─── GET /api/counselor/students/next-id
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "counselor.students");
    if (auth instanceof NextResponse) return auth;

    const year = req.nextUrl.searchParams.get("year");
    if (!year) {
      return NextResponse.json(
        { success: false, error: "Year parameter is required" },
        { status: 400 }
      );
    }

    const yy = String(year).slice(-2);

    // Find highest sequence number for student IDs starting with this year prefix
    const result = await db
      .select({ studentId: students.studentId })
      .from(students)
      .where(like(students.studentId, `${yy}%`))
      .orderBy(sql`RIGHT(${students.studentId}, 3) DESC`)
      .limit(1);

    let nextNumber = 1;

    if (result.length > 0 && result[0].studentId) {
      const match = result[0].studentId.match(/(\d{3,})$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        nextNumber,
        nextFormatted: String(nextNumber).padStart(3, "0"),
        yearPrefix: yy,
      },
    });
  } catch (error) {
    console.error("[GET /api/counselor/students/next-id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
