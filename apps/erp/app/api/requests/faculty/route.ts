import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/app/lib/api-auth";
import { hasPermission } from "@/app/lib/permissions";
import { db } from "@/app/lib/db";
import { studentRequests, students, faculty } from "@/app/lib/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

/**
 * GET /api/requests/faculty
 *
 * Returns paginated list of requests assigned to the authenticated faculty.
 * Query params: ?status=pending|approved|rejected  &limit=  &offset=
 */
export async function GET(req: NextRequest) {
  try {
    const result = await requireAnyPermission(req, ["requests.view_assigned", "requests.view_all"]);
    if (result instanceof NextResponse) return result;
    const auth = result;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build conditions
    const conditions = [];
    const canViewAll = hasPermission(auth.activeRole, "requests.view_all");
    if (!canViewAll) {
      conditions.push(eq(studentRequests.targetFacultyId, auth.userId));
    }
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      conditions.push(eq(studentRequests.status, status));
    }

    const whereClause = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    const results = await db
      .select({
        id: studentRequests.id,
        studentId: studentRequests.studentId,
        targetFacultyId: studentRequests.targetFacultyId,
        semesterId: studentRequests.semesterId,
        requestType: studentRequests.requestType,
        subject: studentRequests.subject,
        description: studentRequests.description,
        status: studentRequests.status,
        remarks: studentRequests.remarks,
        attachmentUrl: studentRequests.attachmentUrl,
        attachmentType: studentRequests.attachmentType,
        attachmentSize: studentRequests.attachmentSize,
        createdAt: studentRequests.createdAt,
        updatedAt: studentRequests.updatedAt,
        studentName: students.fullName,
        targetFacultyName: faculty.name,
        divisionName: sql<string>`coalesce(${students.currentDivisionName}, 'N/A')`,
      })
      .from(studentRequests)
      .innerJoin(students, eq(studentRequests.studentId, students.id))
      .innerJoin(faculty, eq(studentRequests.targetFacultyId, faculty.id))
      .where(whereClause)
      .orderBy(desc(studentRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ totalCount }] = await db
      .select({ totalCount: count(studentRequests.id) })
      .from(studentRequests)
      .where(whereClause);

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
    console.error("[GET /api/requests/faculty]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch faculty requests" },
      { status: 500 }
    );
  }
}
