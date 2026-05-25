import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  subjects,
  students,
  divisions,
  marks,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  faculty,
} from "@/app/lib/schema";
import { eq, and, inArray } from "drizzle-orm";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── GET /api/subjects/[code] — Subject detail with role-based access ─────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireAnyPermission(req, ["subjects.view_course", "subjects.view_own"]);
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole } = auth;

    const { code } = await params;
    const decodedCode = decodeURIComponent(code);

    // Fetch subject from master
    const [subject] = await db
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
      .from(subjects)
      .where(eq(subjects.code, decodedCode))
      .limit(1);

    if (!subject) return err("Subject not found", 404);

    // Fetch all current assignments for this subject — scoped to each division's current semester
    const allAssignments = await db
      .select({
        id: facultySubjectAssignments.id,
        facultyName: faculty.name,
        divisionName: divisions.displayName,
        courseCode: divisions.courseCode,
        divisionId: facultySubjectAssignments.divisionId,
        facultyId: facultySubjectAssignments.facultyId,
        semesterId: facultySubjectAssignments.semesterId,
      })
      .from(facultySubjectAssignments)
      .innerJoin(divisions, and(
        eq(facultySubjectAssignments.divisionId, divisions.id),
        eq(facultySubjectAssignments.semesterId, divisions.semesterId)
      ))
      .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
      .where(eq(facultySubjectAssignments.subjectId, subject.id));

    // ── Access control ──────────────────────────────────────────────
    let filteredAssignments = allAssignments;
    let studentMarks: Record<string, unknown> | null = null;

    if (activeRole === "student") {
      // Student can only see this subject if it's in their division
      if (!auth.divisionId) return err("Forbidden", 403);

      const currentDivisionId = auth.divisionId;

      const inDivision = allAssignments.some(
        (a) => a.divisionId === currentDivisionId
      );
      if (!inDivision) return err("Forbidden: subject not in your division", 403);

      filteredAssignments = allAssignments.filter(
        (a) => a.divisionId === currentDivisionId
      );

      // Fetch student marks for this subject
      if (filteredAssignments.length > 0) {
        const assignmentIds = filteredAssignments.map((a) => a.id);
        const semesterId = filteredAssignments[0].semesterId;
        const [marksRow] = await db
          .select({
            internalTheory: marks.internalTheory,
            externalTheory: marks.externalTheory,
            internalPractical: marks.internalPractical,
            externalPractical: marks.externalPractical,
            maxInternalTheory: marks.maxInternalTheory,
            maxExternalTheory: marks.maxExternalTheory,
            maxInternalPractical: marks.maxInternalPractical,
            maxExternalPractical: marks.maxExternalPractical,
          })
          .from(marks)
          .where(
            and(
              eq(marks.studentId, userId),
              eq(marks.semesterId, semesterId),
              inArray(marks.assignmentId, assignmentIds)
            )
          )
          .limit(1);

        studentMarks = marksRow ?? null;
      }
    } else if (activeRole === "faculty") {
      // Faculty can only see subjects assigned to them
      const isAssigned = allAssignments.some((a) => a.facultyId === userId);
      if (!isAssigned) return err("Forbidden: subject not assigned to you", 403);
      filteredAssignments = allAssignments.filter((a) => a.facultyId === userId);
    } else if (activeRole === "counselor") {
      // Counselor can see subjects from their assigned divisions
      const counselorDivisionIds = auth.counselorDivisionIds ?? [];
      if (counselorDivisionIds.length === 0) {
        return err("Forbidden: subject not in your divisions", 403);
      }

      const divIds = new Set(counselorDivisionIds);
      const hasAccess = allAssignments.some((a) => divIds.has(a.divisionId));
      if (!hasAccess) return err("Forbidden: subject not in your divisions", 403);
      filteredAssignments = allAssignments.filter((a) => divIds.has(a.divisionId));
    }
    // HOD: full access — no filtering needed

    return ok({
      role: activeRole,
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        subjectType: subject.subjectType,
        internalTheoryMax: subject.internalTheoryMax,
        externalTheoryMax: subject.externalTheoryMax,
        theoryPassingMarks: subject.theoryPassingMarks,
        internalPracticalMax: subject.internalPracticalMax,
        externalPracticalMax: subject.externalPracticalMax,
        practicalPassingMarks: subject.practicalPassingMarks,
      },
      assignments: filteredAssignments.map((a) => ({
        id: a.id,
        facultyName: a.facultyName,
        divisionName: a.divisionName,
        courseCode: a.courseCode,
      })),
      // Only for students
      marks: activeRole === "student" ? studentMarks : undefined,
    });
  } catch (error) {
    console.error("[GET /api/subjects/[code]]", error);
    return err("Internal server error", 500);
  }
}
