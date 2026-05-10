import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  subjects,
  faculty,
  students,
  divisions,
  facultySubjectAssignments,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Shared columns we select from faculty_subject_assignments ────────────────

const assignmentCols = {
  subjectId: facultySubjectAssignments.subjectId,
  subjectName: facultySubjectAssignments.subjectName,
  subjectType: facultySubjectAssignments.subjectType,
  facultyName: facultySubjectAssignments.facultyName,
  divisionName: facultySubjectAssignments.divisionName,
  courseCode: facultySubjectAssignments.courseCode,
  divisionId: facultySubjectAssignments.divisionId,
  facultyId: facultySubjectAssignments.facultyId,
};

// ─── GET /api/subjects — Mode-filtered subject list ───────────────────────────

export async function GET(req: NextRequest) {
  try {
    const payload = await authenticate();
    if (!payload) return err("Unauthorized", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];

    // Read the user's CURRENT MODE from x-active-role header (set by middleware
    // from the active_role cookie, validated against JWT roles).
    // Fallback to priority order only when header is missing (first load).
    const headerRole = req.headers.get("x-active-role");
    const rolePriority = ["hod", "counselor", "faculty", "student"];
    const activeRole =
      headerRole && rolesArray.includes(headerRole)
        ? headerRole
        : rolePriority.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

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
        .select(assignmentCols)
        .from(facultySubjectAssignments)
        .innerJoin(divisions, and(
          eq(facultySubjectAssignments.divisionId, divisions.id),
          eq(facultySubjectAssignments.semesterId, divisions.semesterId)
        ));

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
      // Get divisions assigned to this counselor (matched to division's current semester)
      const counselorDivs = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .innerJoin(divisions, and(
          eq(counselorDivisionAssignments.divisionId, divisions.id),
          eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
        ))
        .where(eq(counselorDivisionAssignments.facultyId, payload.userId));

      const divisionIds = counselorDivs.map((d) => d.divisionId);
      if (divisionIds.length === 0) {
        return ok({
          role: activeRole,
          subjects: [],
          emptyMessage: "You are not assigned as a counselor for any division.",
        });
      }

      // Get subject assignments for those divisions — scoped to each division's current semester
      const rows = await db
        .select(assignmentCols)
        .from(facultySubjectAssignments)
        .innerJoin(divisions, and(
          eq(facultySubjectAssignments.divisionId, divisions.id),
          eq(facultySubjectAssignments.semesterId, divisions.semesterId)
        ))
        .where(inArray(facultySubjectAssignments.divisionId, divisionIds));

      // Deduplicate by subjectId and enrich with subject master data
      const subjectIds = [...new Set(rows.map((r) => r.subjectId))];
      const subjectMasters = subjectIds.length > 0
        ? await db.select().from(subjects).where(inArray(subjects.id, subjectIds))
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
        .select(assignmentCols)
        .from(facultySubjectAssignments)
        .innerJoin(divisions, and(
          eq(facultySubjectAssignments.divisionId, divisions.id),
          eq(facultySubjectAssignments.semesterId, divisions.semesterId)
        ))
        .where(eq(facultySubjectAssignments.facultyId, payload.userId));

      const subjectIds = [...new Set(rows.map((r) => r.subjectId))];
      const subjectMasters = subjectIds.length > 0
        ? await db.select().from(subjects).where(inArray(subjects.id, subjectIds))
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
      const [student] = await db
        .select({
          currentDivisionId: students.currentDivisionId,
        })
        .from(students)
        .where(eq(students.id, payload.userId))
        .limit(1);

      if (!student?.currentDivisionId) {
        return ok({ role: activeRole, subjects: [] });
      }

      // Get division's semester
      const [div] = await db
        .select({ semesterId: divisions.semesterId })
        .from(divisions)
        .where(eq(divisions.id, student.currentDivisionId))
        .limit(1);

      if (!div) return ok({ role: activeRole, subjects: [] });

      const rows = await db
        .select(assignmentCols)
        .from(facultySubjectAssignments)
        .where(
          and(
            eq(facultySubjectAssignments.divisionId, student.currentDivisionId),
            eq(facultySubjectAssignments.semesterId, div.semesterId)
          )
        );

      const subjectIds = [...new Set(rows.map((r) => r.subjectId))];
      const subjectMasters = subjectIds.length > 0
        ? await db.select().from(subjects).where(inArray(subjects.id, subjectIds))
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