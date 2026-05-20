import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  internalExamMarks,
  internalExams,
  students,
  subjects,
  facultySubjectAssignments,
} from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/internal-exams/student-marks
 * Student self-view — returns only published + visible marks.
 * Groups by subject, includes max marks.
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (!rolesArray.includes("student")) {
      return err("Forbidden: students only", 403);
    }

    // Get the student record
    const [student] = await db
      .select({
        id: students.id,
        currentDivisionId: students.currentDivisionId,
      })
      .from(students)
      .where(eq(students.id, payload.userId))
      .limit(1);

    if (!student) return err("Student not found", 404);

    // Fetch all visible marks for this student
    const marks = await db
      .select({
        id: internalExamMarks.id,
        examId: internalExamMarks.internalExamId,
        subjectName: internalExamMarks.subjectName,
        theoryMarks: internalExamMarks.theoryMarks,
        practicalMarks: internalExamMarks.practicalMarks,
        divisionName: internalExamMarks.divisionName,
        assignmentId: internalExamMarks.assignmentId,
      })
      .from(internalExamMarks)
      .where(
        and(
          eq(internalExamMarks.studentId, payload.userId),
          eq(internalExamMarks.isVisible, true)
        )
      );

    // Enrich with exam names and max marks
    const examIds = [...new Set(marks.map((m) => m.examId))];
    const assignmentIds = [...new Set(marks.map((m) => m.assignmentId))];

    // Fetch exam details
    const examDetails: Record<number, { examName: string; examNumber: number }> = {};
    for (const eid of examIds) {
      const [exam] = await db
        .select({ examName: internalExams.examName, examNumber: internalExams.examNumber })
        .from(internalExams)
        .where(eq(internalExams.id, eid))
        .limit(1);
      if (exam) examDetails[eid] = exam;
    }

    // Fetch subject max marks per assignment
    const maxMarksMap: Record<number, { theoryMax: number | null; practicalMax: number | null; subjectType: string }> = {};
    for (const aid of assignmentIds) {
      const [assignment] = await db
        .select({
          subjectId: facultySubjectAssignments.subjectId,
          subjectType: facultySubjectAssignments.subjectType,
        })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.id, aid))
        .limit(1);
      if (assignment) {
        const [subj] = await db
          .select({
            internalTheoryMax: subjects.internalTheoryMax,
            internalPracticalMax: subjects.internalPracticalMax,
          })
          .from(subjects)
          .where(eq(subjects.id, assignment.subjectId))
          .limit(1);
        maxMarksMap[aid] = {
          theoryMax: subj?.internalTheoryMax ?? null,
          practicalMax: subj?.internalPracticalMax ?? null,
          subjectType: assignment.subjectType,
        };
      }
    }

    // Build response grouped by subject
    const enrichedMarks = marks.map((m) => ({
      ...m,
      examName: examDetails[m.examId]?.examName ?? "Unknown",
      examNumber: examDetails[m.examId]?.examNumber ?? 0,
      maxTheory: maxMarksMap[m.assignmentId]?.theoryMax ?? null,
      maxPractical: maxMarksMap[m.assignmentId]?.practicalMax ?? null,
      subjectType: maxMarksMap[m.assignmentId]?.subjectType ?? "theory",
    }));

    return ok({ marks: enrichedMarks });
  } catch (error) {
    console.error("[GET /api/internal-exams/student-marks]", error);
    return err("Internal server error", 500);
  }
}
