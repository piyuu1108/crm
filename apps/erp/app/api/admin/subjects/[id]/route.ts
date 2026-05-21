import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  subjects,
  facultySubjectAssignments,
  divisions,
  faculty,
} from "@/app/lib/schema";
import { eq, and, ne } from "drizzle-orm";
import { cacheTags, clearCache } from "@/app/lib/cache";

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(data: unknown, message?: string) {
  return NextResponse.json({ success: true, data, message }, { status: 200 });
}

function err(error: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json({ success: false, error, errors }, { status });
}

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function authorize(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── PUT /api/admin/subjects/[id] — Update a subject ─────────────────────────

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
    if ("error" in auth && auth.error) return auth.error;

    const { id: idStr } = await context.params;
    const subjectId = parseInt(idStr, 10);
    if (isNaN(subjectId)) return err("Invalid subject ID", 400);

    const body = await req.json();
    const {
      code,
      name,
      shortCode,
      subjectType,
      credit,
      semester,
      internalTheoryMax,
      externalTheoryMax,
      theoryPassingMarks,
      internalPracticalMax,
      externalPracticalMax,
      practicalPassingMarks,
    } = body;

    // ── Validation ────────────────────────────────────────────────────
    const errors: Record<string, string> = {};

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      errors.code = "Subject code is required";
    } else if (code.trim().length > 20) {
      errors.code = "Subject code must be 20 characters or less";
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.name = "Subject name is required";
    } else if (name.trim().length > 100) {
      errors.name = "Name must be 100 characters or less";
    }

    const VALID_TYPES = ["theory", "practical", "both", "project_minor", "project_major"];
    if (!subjectType || !VALID_TYPES.includes(subjectType)) {
      errors.subjectType = "Invalid subject type";
    }

    if (Object.keys(errors).length > 0) {
      return err("Validation failed", 400, errors);
    }

    // ── Check code uniqueness (excluding self) ────────────────────────
    const [existingCode] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.code, code.trim()), ne(subjects.id, subjectId)))
      .limit(1);

    if (existingCode) {
      return err("Validation failed", 409, { code: "Subject code already in use by another subject" });
    }

    // ── Resolve impact: which assignments does this subject have? ─────
    const assignmentRows = await db
      .select({
        id: facultySubjectAssignments.id,
        divisionName: divisions.displayName,
        facultyName: faculty.name,
        semesterId: facultySubjectAssignments.semesterId,
        divisionId: facultySubjectAssignments.divisionId,
        facultyId: facultySubjectAssignments.facultyId,
      })
      .from(facultySubjectAssignments)
      .leftJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
      .leftJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
      .where(eq(facultySubjectAssignments.subjectId, subjectId));

    // ── Update database ───────────────────────────────────────────────
    const hasTheory = subjectType === "theory" || subjectType === "both";
    const hasPractical = subjectType === "practical" || subjectType === "both";
    // Project types have no marks scheme

    const [updated] = await db
      .update(subjects)
      .set({
        code: code.trim(),
        name: name.trim(),
        shortCode: shortCode ? shortCode.trim() : null,
        subjectType,
        credit: credit !== undefined ? Number(credit) || null : null,
        semester: semester !== undefined ? Number(semester) || null : null,
        internalTheoryMax: hasTheory && internalTheoryMax ? Number(internalTheoryMax) : null,
        externalTheoryMax: hasTheory && externalTheoryMax ? Number(externalTheoryMax) : null,
        theoryPassingMarks: hasTheory && theoryPassingMarks ? Number(theoryPassingMarks) : null,
        internalPracticalMax: hasPractical && internalPracticalMax ? Number(internalPracticalMax) : null,
        externalPracticalMax: hasPractical && externalPracticalMax ? Number(externalPracticalMax) : null,
        practicalPassingMarks: hasPractical && practicalPassingMarks ? Number(practicalPassingMarks) : null,
      })
      .where(eq(subjects.id, subjectId))
      .returning();

    if (!updated) return err("Subject not found", 404);

    // Invalidate cached subjects for all affected divisions and faculties
    for (const assignment of assignmentRows) {
      if (assignment.divisionId && assignment.semesterId) {
        await clearCache(cacheTags.subjects.division(assignment.divisionId, assignment.semesterId));
      }
      if (assignment.facultyId) {
        await clearCache(cacheTags.subjects.faculty(assignment.facultyId));
      }
    }

    return ok(
      { subject: updated, affectedAssignments: assignmentRows.length },
      "Subject updated successfully"
    );
  } catch (error) {
    console.error(`[PUT /api/admin/subjects/[id]] Error:`, error);
    return err("Internal server error", 500);
  }
}

// ─── DELETE /api/admin/subjects/[id] — Remove a subject ──────────────────────

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
    if ("error" in auth && auth.error) return auth.error;

    const { id: idStr } = await context.params;
    const subjectId = parseInt(idStr, 10);
    if (isNaN(subjectId)) return err("Invalid subject ID", 400);

    // Check for existing assignments before deleting
    const assignmentCount = await db
      .select({ id: facultySubjectAssignments.id })
      .from(facultySubjectAssignments)
      .where(eq(facultySubjectAssignments.subjectId, subjectId));

    if (assignmentCount.length > 0) {
      return err(
        `Cannot delete: subject has ${assignmentCount.length} active assignment(s). Remove assignments first.`,
        409
      );
    }

    const [deleted] = await db
      .delete(subjects)
      .where(eq(subjects.id, subjectId))
      .returning({ id: subjects.id, code: subjects.code, name: subjects.name });

    if (!deleted) return err("Subject not found", 404);

    return ok(deleted, "Subject deleted successfully");
  } catch (error) {
    console.error(`[DELETE /api/admin/subjects/[id]] Error:`, error);
    return err("Internal server error", 500);
  }
}
