import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/db";
import { assignments, subjects, faculty, classes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * GET /api/assignments/by-class?classId=X
 * Returns all assignments for a given class with subject+faculty info.
 * Optionally filter to only Practical/Both subjects via ?labOnly=true
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classId = request.nextUrl.searchParams.get("classId");
  const labOnly = request.nextUrl.searchParams.get("labOnly") === "true";

  if (!classId) {
    return Response.json({ error: "classId is required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select({
        assignmentId: assignments.id,
        subjectId: subjects.id,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        subjectShortCode: subjects.shortCode,
        subjectCredit: subjects.credit,
        subjectType: subjects.type,
        facultyId: faculty.id,
        facultyCode: faculty.code,
        facultyName: faculty.name,
        classId: classes.id,
        className: classes.name,
      })
      .from(assignments)
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .innerJoin(faculty, eq(assignments.facultyId, faculty.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(eq(assignments.classId, parseInt(classId, 10)))
      .orderBy(subjects.code);

    // Filter to only Practical/Both if requested
    const filtered = labOnly
      ? rows.filter((r) => r.subjectType === "Practical" || r.subjectType === "Both")
      : rows;

    return Response.json(filtered);
  } catch (error) {
    console.error("Get assignments by class error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
