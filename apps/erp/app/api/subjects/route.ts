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
import { remember, cacheKeys, TTL } from "@/app/lib/cache";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

interface CachedSubject {
  id: number;
  code: string;
  name: string;
  subjectType: string;
  facultyName: string;
  divisionName: string;
  internalTheoryMax: number | null;
  externalTheoryMax: number | null;
  theoryPassingMarks: number | null;
  internalPracticalMax: number | null;
  externalPracticalMax: number | null;
  practicalPassingMarks: number | null;
  divisionId: number;
  facultyId: number;
}

async function getDivisionSubjects(divisionId: number, semesterId: number): Promise<CachedSubject[]> {
  return remember(
    cacheKeys.subjects.division(divisionId, semesterId),
    TTL.SUBJECTS,
    async () => {
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
            eq(facultySubjectAssignments.divisionId, divisionId),
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

      return rows.map((row) => {
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
          divisionId: row.divisionId,
          facultyId: row.facultyId,
        };
      });
    }
  );
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

      const divs = await db
        .select({ id: divisions.id, semesterId: divisions.semesterId })
        .from(divisions)
        .where(inArray(divisions.id, divisionIds));

      if (divs.length === 0) {
        return ok({ role: activeRole, subjects: [] });
      }

      const allDivSubjects = await Promise.all(
        divs.map((d) => getDivisionSubjects(d.id, d.semesterId))
      );

      const merged = allDivSubjects.flat();

      // Group assignments by subject to recreate counselor's grouped format
      const grouped = new Map<number, { master: any; assignments: any[] }>();
      for (const row of merged) {
        const existing = grouped.get(row.id);
        const assignment = {
          subjectId: row.id,
          subjectName: row.name,
          subjectType: row.subjectType,
          facultyName: row.facultyName,
          divisionName: row.divisionName,
          divisionId: row.divisionId,
          facultyId: row.facultyId,
        };
        if (existing) {
          existing.assignments.push(assignment);
        } else {
          grouped.set(row.id, {
            master: {
              id: row.id,
              code: row.code,
              name: row.name,
              subjectType: row.subjectType,
              internalTheoryMax: row.internalTheoryMax,
              externalTheoryMax: row.externalTheoryMax,
              theoryPassingMarks: row.theoryPassingMarks,
              internalPracticalMax: row.internalPracticalMax,
              externalPracticalMax: row.externalPracticalMax,
              practicalPassingMarks: row.practicalPassingMarks,
            },
            assignments: [assignment],
          });
        }
      }

      const result = Array.from(grouped.values()).map(({ master, assignments: assigns }) => ({
        ...master,
        assignments: assigns,
      }));

      return ok({ role: activeRole, subjects: result });
    }

    // ── FACULTY: Only assigned subjects ──────────────────────────────
    if (activeRole === "faculty") {
      const result = await remember(
        cacheKeys.subjects.faculty(userId),
        TTL.SUBJECTS,
        async () => {
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

          return Array.from(grouped.values()).map(({ master, assignments: assigns }) => ({
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
        }
      );

      return ok({ role: activeRole, subjects: result });
    }

    // ── STUDENT: Subjects from student's current division ────────────
    if (activeRole === "student") {
      if (!auth.divisionId || !auth.semesterId) {
        return ok({ role: activeRole, subjects: [] });
      }

      const result = await getDivisionSubjects(auth.divisionId, auth.semesterId);
      return ok({ role: activeRole, subjects: result });
    }

    return err("Forbidden: no valid role", 403);
  } catch (error) {
    console.error("[GET /api/subjects]", error);
    return err("Internal server error", 500);
  }
}