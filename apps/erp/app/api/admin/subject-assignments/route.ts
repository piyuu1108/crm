import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  facultySubjectAssignments,
  divisions,
  faculty,
  subjects,
} from "@/app/lib/schema";
import { eq, and, count } from "drizzle-orm";

function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorize(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── GET: List all faculty–subject–division assignments ────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req);
    if ("error" in auth && auth.error) return auth.error;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const divisionFilter = url.searchParams.get("divisionId") || "";

    // Build WHERE conditions — scope to each division's current semester
    // We join with divisions to only show assignments matching the division's current semester
    const conditions: ReturnType<typeof eq>[] = [];
    if (divisionFilter) {
      const divId = parseInt(divisionFilter, 10);
      if (!isNaN(divId)) {
        conditions.push(eq(facultySubjectAssignments.divisionId, divId));
      }
    }

    // Base query: join assignments with divisions to filter by current semester
    // assignments WHERE assignment.semester_id = division.semester_id
    const baseWhere = conditions.length > 0
      ? and(
          eq(facultySubjectAssignments.semesterId, divisions.semesterId),
          ...conditions
        )
      : eq(facultySubjectAssignments.semesterId, divisions.semesterId);

    // Count total
    const [{ total: totalCount }] = await db
      .select({ total: count() })
      .from(facultySubjectAssignments)
      .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
      .where(baseWhere);

    const total = Number(totalCount);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Fetch paginated assignments
    const assignmentRows = await db
      .select({
        id: facultySubjectAssignments.id,
        divisionId: facultySubjectAssignments.divisionId,
        subjectId: facultySubjectAssignments.subjectId,
        facultyId: facultySubjectAssignments.facultyId,
        divisionName: divisions.displayName,
        subjectName: subjects.name,
        subjectType: facultySubjectAssignments.subjectType,
        facultyName: faculty.name,
        courseCode: divisions.courseCode,
      })
      .from(facultySubjectAssignments)
      .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
      .where(baseWhere)
      .orderBy(divisions.displayName, subjects.name)
      .limit(limit)
      .offset(offset);

    // Fetch dropdown data
    const allDivisions = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        semesterNo: divisions.semesterNo,
        batchYear: divisions.batchYear,
      })
      .from(divisions)
      .orderBy(divisions.displayName);

    const allFaculty = await db
      .select({ id: faculty.id, name: faculty.name, designation: faculty.designation })
      .from(faculty)
      .where(eq(faculty.isActive, true))
      .orderBy(faculty.name);

    const allSubjects = await db
      .select({ id: subjects.id, name: subjects.name, code: subjects.code, subjectType: subjects.subjectType })
      .from(subjects)
      .orderBy(subjects.name);

    return ok({
      assignments: assignmentRows,
      pagination: { page, limit, total, totalPages },
      allDivisions,
      allFaculty,
      allSubjects,
    });
  } catch (error) {
    console.error("[GET /api/admin/subject-assignments]", error);
    return err("Internal server error", 500);
  }
}

// ─── POST: Create a new faculty–subject–division assignment ───────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req);
    if ("error" in auth && auth.error) return auth.error;

    const body = await req.json();
    const { divisionId, subjectId, facultyId } = body;

    if (!divisionId || !subjectId || !facultyId) {
      return err("divisionId, subjectId, and facultyId are required", 400);
    }

    // 1. Verify division exists — derive semester from it
    const [div] = await db.select().from(divisions).where(eq(divisions.id, divisionId)).limit(1);
    if (!div) return err("Division not found", 404);

    const semesterId = div.semesterId;

    // 2. Verify subject exists
    const [sub] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (!sub) return err("Subject not found", 404);

    // 3. Verify faculty exists and is active
    const [fac] = await db.select().from(faculty).where(eq(faculty.id, facultyId)).limit(1);
    if (!fac) return err("Faculty not found", 404);
    if (!fac.isActive) return err("Faculty member is inactive", 400);

    // 4. CRITICAL: Check duplicate — same division + subject must NOT exist in this semester
    const [existing] = await db
      .select()
      .from(facultySubjectAssignments)
      .where(
        and(
          eq(facultySubjectAssignments.semesterId, semesterId),
          eq(facultySubjectAssignments.divisionId, divisionId),
          eq(facultySubjectAssignments.subjectId, subjectId)
        )
      )
      .limit(1);

    if (existing) {
      return err(
        `Subject "${sub.name}" is already assigned to division "${div.displayName}" for this semester.`,
        409
      );
    }

    // 5. Insert assignment
    const [inserted] = await db
      .insert(facultySubjectAssignments)
      .values({
        semesterId,
        facultyId: fac.id,
        subjectId: sub.id,
        divisionId: div.id,
        subjectType: sub.subjectType,
      })
      .returning();

    const assignment = {
      ...inserted,
      facultyName: fac.name,
      subjectName: sub.name,
      divisionName: div.displayName,
      courseCode: div.courseCode,
    };

    return ok(assignment, 201);
  } catch (error) {
    console.error("[POST /api/admin/subject-assignments]", error);
    return err("Internal server error", 500);
  }
}
