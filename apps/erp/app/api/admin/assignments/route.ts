import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireCourseId } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { counselorDivisionAssignments, divisions, faculty } from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const result = await requirePermission(req, "admin.assignments");
    if (result instanceof NextResponse) return result;
    const auth = result;

    const courseId = requireCourseId(auth);

    // 1. Get divisions scoped to HOD's course (each carries its own semester_id)
    const allDivisions = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        semesterNo: divisions.semesterNo,
        batchYear: divisions.batchYear,
        semesterId: divisions.semesterId,
      })
      .from(divisions)
      .where(eq(divisions.courseId, courseId))
      .orderBy(divisions.displayName);

    // 2. Get faculty scoped to HOD's course
    const allFaculty = await db
      .select({
        id: faculty.id,
        fullName: faculty.name,
        designation: faculty.designation,
      })
      .from(faculty)
      .where(eq(faculty.courseId, courseId))
      .orderBy(faculty.name);

    // 3. Get all active counselor assignments — scoped to each division's semester
    // We join with divisions to only get assignments for the division's current semester
    const activeAssignments = await db
      .select({
        id: counselorDivisionAssignments.id,
        facultyId: counselorDivisionAssignments.facultyId,
        facultyName: faculty.name,
        divisionId: counselorDivisionAssignments.divisionId,
        semesterId: counselorDivisionAssignments.semesterId,
      })
      .from(counselorDivisionAssignments)
      .innerJoin(faculty, eq(counselorDivisionAssignments.facultyId, faculty.id))
      .innerJoin(divisions, and(
        eq(counselorDivisionAssignments.divisionId, divisions.id),
        eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
      ));

    // Process assignments into divisions using Map for O(N + M) performance
    const assignmentsByDivision = new Map<number, { facultyId: number; facultyName: string }[]>();
    for (const a of activeAssignments) {
      if (a.divisionId !== null) {
        let list = assignmentsByDivision.get(a.divisionId);
        if (!list) {
          list = [];
          assignmentsByDivision.set(a.divisionId, list);
        }
        list.push({
          facultyId: a.facultyId,
          facultyName: a.facultyName,
        });
      }
    }

    const divisionsWithCounselors = allDivisions.map((div) => ({
      ...div,
      counselors: assignmentsByDivision.get(div.id) || [],
    }));

    return ok({
      divisions: divisionsWithCounselors,
      allFaculty,
      allDivisions: allDivisions.map(({ semesterId: _, ...rest }) => rest),
    });
  } catch (error) {
    console.error("[GET /api/admin/assignments]", error);
    return err("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await requirePermission(req, "admin.assignments");
    if (result instanceof NextResponse) return result;
    const auth = result;

    const body = await req.json();
    const { facultyId, divisionId } = body;

    if (!facultyId || !divisionId) {
      return err("facultyId and divisionId are required", 400);
    }

    // Verify faculty exists
    const [fac] = await db.select().from(faculty).where(eq(faculty.id, facultyId)).limit(1);
    if (!fac) return err("Faculty not found", 404);

    // Verify division exists — derive semester from it
    const [div] = await db.select().from(divisions).where(eq(divisions.id, divisionId)).limit(1);
    if (!div) return err("Division not found", 404);

    const semesterId = div.semesterId;

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(counselorDivisionAssignments)
      .where(
        and(
          eq(counselorDivisionAssignments.semesterId, semesterId),
          eq(counselorDivisionAssignments.facultyId, facultyId),
          eq(counselorDivisionAssignments.divisionId, divisionId)
        )
      )
      .limit(1);

    if (existing) {
      return err("Already assigned for this semester", 409);
    }

    // Insert
    const [inserted] = await db
      .insert(counselorDivisionAssignments)
      .values({
        semesterId,
        facultyId: fac.id,
        divisionId: div.id,
      })
      .returning();

    const assignment = {
      ...inserted,
      facultyName: fac.name,
      divisionName: div.displayName,
    };

    return ok(assignment, 201);
  } catch (error) {
    console.error("[POST /api/admin/assignments]", error);
    return err("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const result = await requirePermission(req, "admin.assignments");
    if (result instanceof NextResponse) return result;
    const auth = result;

    const body = await req.json();
    const { facultyId, divisionId } = body;

    if (!facultyId || !divisionId) {
      return err("facultyId and divisionId are required", 400);
    }

    // Derive semester from division
    const [div] = await db.select({ semesterId: divisions.semesterId }).from(divisions).where(eq(divisions.id, divisionId)).limit(1);
    if (!div) return err("Division not found", 404);

    await db
      .delete(counselorDivisionAssignments)
      .where(
        and(
          eq(counselorDivisionAssignments.semesterId, div.semesterId),
          eq(counselorDivisionAssignments.facultyId, facultyId),
          eq(counselorDivisionAssignments.divisionId, divisionId)
        )
      );

    return ok({ message: "Assignment removed" });
  } catch (error) {
    console.error("[DELETE /api/admin/assignments]", error);
    return err("Internal server error", 500);
  }
}
