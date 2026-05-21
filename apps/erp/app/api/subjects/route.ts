import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  subjects,
  faculty,
  students,
  divisions,
  facultySubjectAssignments,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { eq, and, inArray } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── GET /api/subjects — Mode-filtered subject list ───────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return err("Unauthorized", 401);

    const { userId, roles: rolesArray, activeRole } = auth;

    // ── HOD: All subjects in the system ──────────────────────────────
    if (activeRole === "hod") {
      const rows = await db
        .select({
          id: subjects.id,
          code: subjects.code,
          name: subjects.name,
          subjectType: subjects.subjectType,
          internalTheoryMax: subjects.internalTheoryMax,
          externalTheoryMax: subjects.externalTheoryMax,
          theoryPassingMarks: subjects.theoryPassingMarks,
          internalPracticalMax: subjects.internalPracticalMax,
          externalPracticalMax: subjects.externalPracticalMax,
          practicalPassingMarks: subjects.practicalPassingMarks,
        })
        .from(subjects);

      // Enrich with assignment info — scoped to each division's current semester
      const assignments = await db
        .select({
          subjectId: facultySubjectAssignments.subjectId,
          subjectName: subjects.name,
          subjectType: facultySubjectAssignments.subjectType,
          facultyName: faculty.name,
          divisionName: divisions.displayName,
          courseCode: divisions.courseCode,
          divisionId: facultySubjectAssignments.divisionId,
          facultyId: facultySubjectAssignments.facultyId,
        })
        .from(facultySubjectAssignments)
        .innerJoin(divisions, and(
          eq(facultySubjectAssignments.divisionId, divisions.id),
          eq(facultySubjectAssignments.semesterId, divisions.semesterId)
        ))
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id));

      const assignmentsBySubjectId = new Map<number, typeof assignments>();
      for (const a of assignments) {
        const list = assignmentsBySubjectId.get(a.subjectId) ?? [];
        list.push(a);
        assignmentsBySubjectId.set(a.subjectId, list);
      }

      const enriched = rows.map((s) => ({
        ...s,
        assignments: assignmentsBySubjectId.get(s.id) ?? [],
      }));

      return ok({ role: activeRole, subjects: enriched });
    }

    // ── COUNSELOR: Subjects from assigned divisions ──────────────────
    if (activeRole === "counselor") {
      const divisionIds = auth.counselorDivisionIds ?? [];
      if (divisionIds.length === 0) {
        return ok({
          role: activeRole,
          subjects: [],
          emptyMessage: "You are not assigned as a counselor for any division.",
        });
      }

      // Get subject assignments for those divisions — scoped to each division's current semester
      const rows = await db
        .select({
          subjectId: facultySubjectAssignments.subjectId,
          subjectName: subjects.name,
          subjectType: facultySubjectAssignments.subjectType,
          facultyName: faculty.name,
          divisionName: divisions.displayName,
          courseCode: divisions.courseCode,
          divisionId: facultySubjectAssignments.divisionId,
          facultyId: facultySubjectAssignments.facultyId,
        })
        .from(facultySubjectAssignments)
        .innerJoin(divisions, and(
          eq(facultySubjectAssignments.divisionId, divisions.id),
          eq(facultySubjectAssignments.semesterId, divisions.semesterId)
        ))
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .where(inArray(facultySubjectAssignments.divisionId, divisionIds));

      // Deduplicate by subjectId and enrich with subject master data
      const subjectIds = [...new Set(rows.map((r) => r.subjectId))];
      const subjectMasters = subjectIds.length > 0
        ? await db.select({
            id: subjects.id,
            code: subjects.code,
            name: subjects.name,
            subjectType: subjects.subjectType,
            internalTheoryMax: subjects.internalTheoryMax,
            externalTheoryMax: subjects.externalTheoryMax,
            theoryPassingMarks: subjects.theoryPassingMarks,
            internalPracticalMax: subjects.internalPracticalMax,
            externalPracticalMax: subjects.externalPracticalMax,
            practicalPassingMarks: subjects.practicalPassingMarks,
          }).from(subjects).where(inArray(subjects.id, subjectIds))
        : [];
      const masterMap = new Map(subjectMasters.map((s) => [s.id, s]));

      // Group assignments by subject
      const grouped = new Map<number, { master: typeof subjectMasters[0]; assignments: typeof rows }>();
      for (const row of rows) {
        const existing = grouped.get(row.subjectId);
        if (existing) {
          existing.assignments.push(row);
        } else {
          const master = masterMap.get(row.subjectId);
          if (master) {
            grouped.set(row.subjectId, { master, assignments: [row] });
          }
        }
      }

      const result = Array.from(grouped.values()).map(({ master, assignments: assigns }) => ({
        id: master.id,
        code: master.code,
        name: master.name,
        subjectType: master.subjectType,
        internalTheoryMax: master.internalTheoryMax,
        externalTheoryMax: master.externalTheoryMax,
        theoryPassingMarks: master.theoryPassingMarks,
        internalPracticalMax: master.internalPracticalMax,
        externalPracticalMax: master.externalPracticalMax,
        practicalPassingMarks: master.practicalPassingMarks,
        assignments: assigns,
      }));

      return ok({ role: activeRole, subjects: result });
    }

    // ── FACULTY: Only assigned subjects ──────────────────────────────
    if (activeRole === "faculty") {
      // Get assignments scoped to each division's current semester
      const rows = await db
        .select({
          subjectId: facultySubjectAssignments.subjectId,
          subjectName: subjects.name,
          subjectType: facultySubjectAssignments.subjectType,
          facultyName: faculty.name,
          divisionName: divisions.displayName,
          courseCode: divisions.courseCode,
          divisionId: facultySubjectAssignments.divisionId,
          facultyId: facultySubjectAssignments.facultyId,
        })
        .from(facultySubjectAssignments)
        .innerJoin(divisions, and(
          eq(facultySubjectAssignments.divisionId, divisions.id),
          eq(facultySubjectAssignments.semesterId, divisions.semesterId)
        ))
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .where(eq(facultySubjectAssignments.facultyId, userId));

      const subjectIds = [...new Set(rows.map((r) => r.subjectId))];
      const subjectMasters = subjectIds.length > 0
        ? await db.select({
            id: subjects.id,
            code: subjects.code,
            name: subjects.name,
            subjectType: subjects.subjectType,
            internalTheoryMax: subjects.internalTheoryMax,
            externalTheoryMax: subjects.externalTheoryMax,
            theoryPassingMarks: subjects.theoryPassingMarks,
            internalPracticalMax: subjects.internalPracticalMax,
            externalPracticalMax: subjects.externalPracticalMax,
            practicalPassingMarks: subjects.practicalPassingMarks,
          }).from(subjects).where(inArray(subjects.id, subjectIds))
        : [];
      const masterMap = new Map(subjectMasters.map((s) => [s.id, s]));

      const grouped = new Map<number, { master: typeof subjectMasters[0]; assignments: typeof rows }>();
      for (const row of rows) {
        const existing = grouped.get(row.subjectId);
        if (existing) {
          existing.assignments.push(row);
        } else {
          const master = masterMap.get(row.subjectId);
          if (master) grouped.set(row.subjectId, { master, assignments: [row] });
        }
      }

      const result = Array.from(grouped.values()).map(({ master, assignments: assigns }) => ({
        id: master.id,
        code: master.code,
        name: master.name,
        subjectType: master.subjectType,
        internalTheoryMax: master.internalTheoryMax,
        externalTheoryMax: master.externalTheoryMax,
        theoryPassingMarks: master.theoryPassingMarks,
        internalPracticalMax: master.internalPracticalMax,
        externalPracticalMax: master.externalPracticalMax,
        practicalPassingMarks: master.practicalPassingMarks,
        assignments: assigns,
      }));

      return ok({ role: activeRole, subjects: result });
    }

    // ── STUDENT: Subjects from student's current division ────────────
    if (activeRole === "student") {
      if (!auth.divisionId || !auth.semesterId) {
        return ok({ role: activeRole, subjects: [] });
      }

      const currentDivisionId = auth.divisionId;
      const semesterId = auth.semesterId;

      const rows = await db
        .select({
          subjectId: facultySubjectAssignments.subjectId,
          subjectName: subjects.name,
          subjectType: facultySubjectAssignments.subjectType,
          facultyName: faculty.name,
          divisionName: divisions.displayName,
          courseCode: divisions.courseCode,
          divisionId: facultySubjectAssignments.divisionId,
          facultyId: facultySubjectAssignments.facultyId,
        })
        .from(facultySubjectAssignments)
        .innerJoin(divisions, eq(divisions.id, facultySubjectAssignments.divisionId))
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .where(
          and(
            eq(facultySubjectAssignments.divisionId, currentDivisionId),
            eq(facultySubjectAssignments.semesterId, semesterId)
          )
        );

      const subjectIds = [...new Set(rows.map((r) => r.subjectId))];
      const subjectMasters = subjectIds.length > 0
        ? await db.select({
            id: subjects.id,
            code: subjects.code,
            name: subjects.name,
            subjectType: subjects.subjectType,
            internalTheoryMax: subjects.internalTheoryMax,
            externalTheoryMax: subjects.externalTheoryMax,
            theoryPassingMarks: subjects.theoryPassingMarks,
            internalPracticalMax: subjects.internalPracticalMax,
            externalPracticalMax: subjects.externalPracticalMax,
            practicalPassingMarks: subjects.practicalPassingMarks,
          }).from(subjects).where(inArray(subjects.id, subjectIds))
        : [];
      const masterMap = new Map(subjectMasters.map((s) => [s.id, s]));

      const result = rows.map((row) => {
        const master = masterMap.get(row.subjectId);
        return {
          id: master?.id ?? row.subjectId,
          code: master?.code ?? "",
          name: row.subjectName,
          subjectType: row.subjectType,
          facultyName: row.facultyName,
          divisionName: row.divisionName,
          internalTheoryMax: master?.internalTheoryMax ?? null,
          externalTheoryMax: master?.externalTheoryMax ?? null,
          theoryPassingMarks: master?.theoryPassingMarks ?? null,
          internalPracticalMax: master?.internalPracticalMax ?? null,
          externalPracticalMax: master?.externalPracticalMax ?? null,
          practicalPassingMarks: master?.practicalPassingMarks ?? null,
        };
      });

      return ok({ role: activeRole, subjects: result });
    }

    return err("Forbidden: no valid role", 403);
  } catch (error) {
    console.error("[GET /api/subjects]", error);
    return err("Internal server error", 500);
  }
}