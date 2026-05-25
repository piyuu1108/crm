import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty, students } from "@/app/lib/schema";
import { eq, ilike, and } from "drizzle-orm";

/**
 * GET /api/requests/faculty-search
 *
 * Searchable faculty dropdown for students creating a request.
 * Query params: ?q=search_term
 * Returns: { id, name, facultyCode, designation }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAnyPermission(req, [
      "requests.create",
      "requests.review",
      "requests.view_all",
    ]);
    if (auth instanceof NextResponse) return auth;

    // Any authenticated user can search faculty — scoped to their course
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    // Resolve the caller's course:
    //  - Faculty/HOD: courseId is directly in the JWT
    //  - Students: look up their courseId via the students table
    let courseId: number | undefined = auth.courseId;

    if (!courseId && auth.roles.includes("student")) {
      const [studentRow] = await db
        .select({ courseId: students.courseId })
        .from(students)
        .where(eq(students.id, auth.userId))
        .limit(1);
      courseId = studentRow?.courseId ?? undefined;
    }

    // Build WHERE: always active; filter by course if known
    const conditions: ReturnType<typeof eq>[] = [eq(faculty.isActive, true)];
    if (courseId) conditions.push(eq(faculty.courseId, courseId));
    if (query.length > 0) conditions.push(ilike(faculty.name, `%${query}%`));

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const results = await db
      .select({
        id: faculty.id,
        name: faculty.name,
        facultyCode: faculty.facultyCode,
        designation: faculty.designation,
      })
      .from(faculty)
      .where(whereClause)
      .limit(query ? 50 : 500);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("[GET /api/requests/faculty-search]", error);
    return NextResponse.json(
      { success: false, error: "Failed to search faculty" },
      { status: 500 }
    );
  }
}
