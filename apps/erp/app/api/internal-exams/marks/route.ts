import { NextRequest, NextResponse } from "next/server";
import { requirePermission, AuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  internalExamMarks,
  internalExams,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  students,
  subjects,
  divisions,
} from "@/app/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Shared RBAC check: returns true if the user can access the assignment
async function canAccessAssignment(
  auth: AuthContext,
  assignmentId: number
): Promise<boolean> {
  const { activeRole: resolvedRole, userId } = auth;
  if (resolvedRole === "hod") return true;

  const [assignment] = await db
    .select({
      facultyId: facultySubjectAssignments.facultyId,
      divisionId: facultySubjectAssignments.divisionId,
    })
    .from(facultySubjectAssignments)
    .where(eq(facultySubjectAssignments.id, assignmentId))
    .limit(1);

  if (!assignment) return false;

  if (resolvedRole === "faculty") {
    return assignment.facultyId === userId;
  }

  if (resolvedRole === "counselor") {
    const counselorDivisionIds = auth.counselorDivisionIds ?? [];
    return counselorDivisionIds.includes(assignment.divisionId);
  }

  return false;
}

/**
 * GET /api/internal-exams/marks
 * Fetch marks for a given exam + assignment.
 * Query: ?examId=...&assignmentId=...
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "exams.view");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const examId = parseInt(searchParams.get("examId") || "0", 10);
    const assignmentId = parseInt(searchParams.get("assignmentId") || "0", 10);

    if (!examId || !assignmentId) {
      return err("examId and assignmentId are required", 400);
    }

    if (!(await canAccessAssignment(auth, assignmentId))) {
      return err("Forbidden: no access to this assignment", 403);
    }

    // Get the assignment details to understand subject type and max marks
    const [assignment] = await db
      .select({
        id: facultySubjectAssignments.id,
        subjectId: facultySubjectAssignments.subjectId,
        subjectName: subjects.name,
        subjectType: facultySubjectAssignments.subjectType,
        divisionId: facultySubjectAssignments.divisionId,
        divisionName: divisions.displayName,
      })
      .from(facultySubjectAssignments)
      .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .where(eq(facultySubjectAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return err("Assignment not found", 404);

    // Get max marks from subjects table
    const [subject] = await db
      .select({
        internalTheoryMax: subjects.internalTheoryMax,
        internalPracticalMax: subjects.internalPracticalMax,
      })
      .from(subjects)
      .where(eq(subjects.id, assignment.subjectId))
      .limit(1);

    // Fetch existing marks
    const marks = await db
      .select({
        id: internalExamMarks.id,
        internalExamId: internalExamMarks.internalExamId,
        assignmentId: internalExamMarks.assignmentId,
        studentId: internalExamMarks.studentId,
        theoryMarks: internalExamMarks.theoryMarks,
        practicalMarks: internalExamMarks.practicalMarks,
        isDraft: internalExamMarks.isDraft,
        isVisible: internalExamMarks.isVisible,
        studentName: students.fullName,
        subjectName: sql<string>`${assignment.subjectName}`,
        divisionName: sql<string>`${assignment.divisionName}`,
        updatedByFacultyId: internalExamMarks.updatedByFacultyId,
        updatedAt: internalExamMarks.updatedAt,
      })
      .from(internalExamMarks)
      .innerJoin(students, eq(internalExamMarks.studentId, students.id))
      .where(
        and(
          eq(internalExamMarks.internalExamId, examId),
          eq(internalExamMarks.assignmentId, assignmentId)
        )
      );

    // Get all students in the division for pre-filling
    const divisionStudents = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        studentId: students.studentId,
        enrollmentId: students.enrollmentId,
      })
      .from(students)
      .where(eq(students.currentDivisionId, assignment.divisionId));

    return ok({
      marks,
      students: divisionStudents,
      assignment,
      maxMarks: {
        theory: subject?.internalTheoryMax ?? null,
        practical: subject?.internalPracticalMax ?? null,
      },
    });
  } catch (error) {
    console.error("[GET /api/internal-exams/marks]", error);
    return err("Internal server error", 500);
  }
}

/**
 * POST /api/internal-exams/marks
 * Batch upsert marks for an exam + assignment.
 * Body: { examId, assignmentId, isDraft, records: [{ studentId, theoryMarks?, practicalMarks?, studentName, subjectName, divisionName }] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "exams.evaluate");
    if (auth instanceof NextResponse) return auth;

    const { userId } = auth;

    const body = await req.json();
    const { examId, assignmentId, isDraft, records } = body;

    if (!examId || !assignmentId || !Array.isArray(records) || records.length === 0) {
      return err("examId, assignmentId, and non-empty records are required", 400);
    }

    if (!(await canAccessAssignment(auth, assignmentId))) {
      return err("Forbidden: no access to this assignment", 403);
    }

    // Verify exam exists
    const [exam] = await db
      .select({ id: internalExams.id })
      .from(internalExams)
      .where(eq(internalExams.id, examId))
      .limit(1);
    if (!exam) return err("Exam not found", 404);

    // Batch upsert using raw SQL for ON CONFLICT
    const values = records.map(
      (r: {
        studentId: number;
        theoryMarks: number | null;
        practicalMarks: number | null;
      }) =>
        sql`(${examId}, ${assignmentId}, ${r.studentId}, ${r.theoryMarks}, ${r.practicalMarks}, ${isDraft ?? true}, false, ${userId}, NOW())`
    );

    await db.execute(sql`
      INSERT INTO internal_exam_marks
        (internal_exam_id, assignment_id, student_id, theory_marks, practical_marks, is_draft, is_visible, updated_by_faculty_id, updated_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (internal_exam_id, assignment_id, student_id)
      DO UPDATE SET
        theory_marks = EXCLUDED.theory_marks,
        practical_marks = EXCLUDED.practical_marks,
        is_draft = EXCLUDED.is_draft,
        updated_by_faculty_id = EXCLUDED.updated_by_faculty_id,
        updated_at = NOW()
    `);

    return ok({ saved: records.length });
  } catch (error) {
    console.error("[POST /api/internal-exams/marks]", error);
    return err("Internal server error", 500);
  }
}
