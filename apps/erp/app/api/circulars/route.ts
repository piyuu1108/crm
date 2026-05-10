import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { circulars, students } from "@/app/lib/schema";
import { desc, eq, and, or, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: invalid session" },
        { status: 401 }
      );
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    const isStudent = roles.includes("student");
    
    // Parse pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let queryCondition = undefined;

    if (isStudent) {
      // Find student details
      const [studentData] = await db
        .select({
          currentSemesterNo: students.currentSemesterNo,
          currentDivisionId: students.currentDivisionId,
        })
        .from(students)
        .where(eq(students.id, payload.userId));

      if (studentData) {
        const studentYear = studentData.currentSemesterNo 
          ? Math.ceil(studentData.currentSemesterNo / 2) 
          : null;

        queryCondition = or(
          eq(circulars.targetType, "ALL"),
          and(
            eq(circulars.targetType, "YEAR"),
            studentYear ? eq(circulars.targetYear, studentYear) : undefined
          ),
          and(
            eq(circulars.targetType, "DIVISION"),
            studentData.currentDivisionId ? eq(circulars.targetDivisionId, studentData.currentDivisionId) : undefined
          )
        );
      } else {
        // Fallback if student details are missing: only show ALL
        queryCondition = eq(circulars.targetType, "ALL");
      }
    }

    const results = await db
      .select()
      .from(circulars)
      .where(queryCondition)
      .orderBy(desc(circulars.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ totalCount }] = await db
      .select({ totalCount: count(circulars.id) })
      .from(circulars)
      .where(queryCondition);

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        total: Number(totalCount),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[GET /api/circulars]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch circulars" },
      { status: 500 }
    );
  }
}
