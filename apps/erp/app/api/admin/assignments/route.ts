import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { counselorDivisionAssignments, divisions, faculty, semesters } from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorize() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid or expired session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

export async function GET() {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

    // 1. Get all divisions (each carries its own semester_id)
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
      .orderBy(divisions.displayName);

    // 2. Get all faculty
    const allFaculty = await db
      .select({
        id: faculty.id,
        fullName: faculty.name,
        designation: faculty.designation,
      })
      .from(faculty)
      .orderBy(faculty.name);

    // 3. Get all active counselor assignments — scoped to each division's semester
    // We join with divisions to only get assignments for the division's current semester
    const activeAssignments = await db
      .select({
        id: counselorDivisionAssignments.id,
        facultyId: counselorDivisionAssignments.facultyId,
        facultyName: counselorDivisionAssignments.facultyName,
        divisionId: counselorDivisionAssignments.divisionId,
        semesterId: counselorDivisionAssignments.semesterId,
      })
      .from(counselorDivisionAssignments)
      .innerJoin(divisions, and(
        eq(counselorDivisionAssignments.divisionId, divisions.id),
        eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
      ));

    // Process assignments into divisions
    const divisionsWithCounselors = allDivisions.map((div) => {
      const counselors = activeAssignments
        .filter((a) => a.divisionId === div.id)
        .map((a) => ({
          facultyId: a.facultyId,
          facultyName: a.facultyName,
        }));

      return {
        ...div,
        counselors,
      };
    });

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
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

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
    const [assignment] = await db
      .insert(counselorDivisionAssignments)
      .values({
        semesterId,
        facultyId: fac.id,
        divisionId: div.id,
        facultyName: fac.name,
        divisionName: div.displayName,
      })
      .returning();

    return ok(assignment, 201);
  } catch (error) {
    console.error("[POST /api/admin/assignments]", error);
    return err("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

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
