import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  internalEvaluations,
  internalExamMarks,
  internalExams,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  subjects,
  students,
  semesters,
  divisions,
} from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown, headers?: Record<string, string>) {
  return NextResponse.json({ success: true, data }, { headers });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/internal-evaluation/export
 * Validate and generate CSV for download.
 * Query: ?assignmentId=...&semesterId=...&download=true (for actual CSV download)
 *
 * Without download=true → returns preview data + validation.
 * With download=true → returns CSV text with Content-Disposition header.
 *
 * CSV format:
 * StudentID, StudentName, SubjectCode, Int1_Theory, Int1_Theory_Max, Int1_Practical, Int1_Practical_Max, Int1_Total, ..., Eval_Theory, Eval_Theory_Max, Eval_Practical, Eval_Practical_Max, Eval_Total
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    const activeRole = req.headers.get("X-Active-Role") ?? null;
    const ROLE_PRIORITY = ["hod", "counselor", "faculty"];
    const resolvedRole =
      activeRole && rolesArray.includes(activeRole)
        ? activeRole
        : ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = parseInt(searchParams.get("assignmentId") || "0", 10);
    let semesterId = parseInt(searchParams.get("semesterId") || "0", 10);
    const download = searchParams.get("download") === "true";

    if (!assignmentId) return err("assignmentId is required", 400);

    // RBAC
    if (resolvedRole !== "hod") {
      const [assignment] = await db
        .select({
          facultyId: facultySubjectAssignments.facultyId,
          divisionId: facultySubjectAssignments.divisionId,
        })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.id, assignmentId))
        .limit(1);

      if (!assignment) return err("Assignment not found", 404);

      if (resolvedRole === "faculty" && assignment.facultyId !== payload.userId) {
        return err("Forbidden: not your assignment", 403);
      }
      if (resolvedRole === "counselor") {
        const counselorDivisionIds = payload.counselorDivisionIds ?? [];
        if (!counselorDivisionIds.includes(assignment.divisionId)) {
          return err("Forbidden: not your division", 403);
        }
      }
    }

    if (!semesterId) {
      const [activeSem] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.isActive, true))
        .limit(1);
      if (!activeSem) return err("No active semester", 404);
      semesterId = activeSem.id;
    }

    // Get assignment details
    const [assignment] = await db
      .select({
        id: facultySubjectAssignments.id,
        subjectId: facultySubjectAssignments.subjectId,
        subjectName: subjects.name,
        subjectType: facultySubjectAssignments.subjectType,
        divisionName: divisions.displayName,
      })
      .from(facultySubjectAssignments)
      .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .where(eq(facultySubjectAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return err("Assignment not found", 404);

    // Get subject code and max marks
    const [subject] = await db
      .select({
        code: subjects.code,
        internalTheoryMax: subjects.internalTheoryMax,
        internalPracticalMax: subjects.internalPracticalMax,
      })
      .from(subjects)
      .where(eq(subjects.id, assignment.subjectId))
      .limit(1);

    if (!subject) return err("Subject not found", 404);

    const subjectCode = subject.code;
    const theoryMax = subject.internalTheoryMax;
    const practicalMax = subject.internalPracticalMax;
    const subjectType = assignment.subjectType;

    // Get exams for this semester
    const exams = await db
      .select()
      .from(internalExams)
      .where(eq(internalExams.semesterId, semesterId))
      .orderBy(internalExams.examNumber);

    // Get raw marks
    const rawMarks = await db
      .select()
      .from(internalExamMarks)
      .where(eq(internalExamMarks.assignmentId, assignmentId));

    // Get evaluations
    const evaluations = await db
      .select()
      .from(internalEvaluations)
      .where(
        and(
          eq(internalEvaluations.assignmentId, assignmentId),
          eq(internalEvaluations.semesterId, semesterId)
        )
      );

    // Get students
    const [assignmentFull] = await db
      .select({ divisionId: facultySubjectAssignments.divisionId })
      .from(facultySubjectAssignments)
      .where(eq(facultySubjectAssignments.id, assignmentId))
      .limit(1);

    const divisionStudents = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        studentId: students.studentId,
      })
      .from(students)
      .where(eq(students.currentDivisionId, assignmentFull.divisionId));

    // Build rows with validation
    const errors: string[] = [];
    const rows: Record<string, unknown>[] = [];

    for (const student of divisionStudents) {
      const row: Record<string, unknown> = {
        StudentID: student.studentId || student.id,
        StudentName: student.fullName,
        SubjectCode: subjectCode,
      };

      let rowValid = true;

      // Add each exam's marks
      for (const exam of exams) {
        const mark = rawMarks.find(
          (m) => m.internalExamId === exam.id && m.studentId === student.id
        );
        const prefix = `Int${exam.examNumber}`;

        const getExportVal = (valStr: string | null | undefined) => {
          if (!valStr) return null;
          const num = parseFloat(valStr);
          return num === -1 ? "AB" : num;
        };
        const getNumericVal = (valStr: string | null | undefined) => {
          if (!valStr) return 0;
          const num = parseFloat(valStr);
          return num === -1 ? 0 : num;
        };

        if (subjectType === "theory" || subjectType === "both") {
          const tm = getExportVal(mark?.theoryMarks);
          row[`${prefix}_Theory`] = tm;
          row[`${prefix}_Theory_Max`] = theoryMax;
          if (tm === null) {
            errors.push(`${student.fullName}: missing ${exam.examName} theory marks`);
            rowValid = false;
          } else if (typeof tm === 'number' && theoryMax && tm > theoryMax) {
            errors.push(`${student.fullName}: ${exam.examName} theory marks exceed max (${tm} > ${theoryMax})`);
            rowValid = false;
          }
        }

        if (subjectType === "practical" || subjectType === "both") {
          const pm = getExportVal(mark?.practicalMarks);
          row[`${prefix}_Practical`] = pm;
          row[`${prefix}_Practical_Max`] = practicalMax;
          if (pm === null) {
            errors.push(`${student.fullName}: missing ${exam.examName} practical marks`);
            rowValid = false;
          } else if (typeof pm === 'number' && practicalMax && pm > practicalMax) {
            errors.push(`${student.fullName}: ${exam.examName} practical marks exceed max (${pm} > ${practicalMax})`);
            rowValid = false;
          }
        }

        // Total for this exam
        const theoryVal = (subjectType === "theory" || subjectType === "both") ? getNumericVal(mark?.theoryMarks) : 0;
        const practicalVal = (subjectType === "practical" || subjectType === "both") ? getNumericVal(mark?.practicalMarks) : 0;
        row[`${prefix}_Total`] = theoryVal + practicalVal;
      }

      // Add evaluation marks
      const evaluation = evaluations.find((e) => e.studentId === student.id);
      
      const getExportVal = (valStr: string | null | undefined) => {
        if (!valStr) return null;
        const num = parseFloat(valStr);
        return num === -1 ? "AB" : num;
      };
      const getNumericVal = (valStr: string | null | undefined) => {
        if (!valStr) return 0;
        const num = parseFloat(valStr);
        return num === -1 ? 0 : num;
      };

      if (subjectType === "theory" || subjectType === "both") {
        const et = getExportVal(evaluation?.finalTheoryMarks);
        row["Eval_Theory"] = et;
        row["Eval_Theory_Max"] = theoryMax;
        if (et === null) {
          errors.push(`${student.fullName}: missing evaluation theory marks`);
          rowValid = false;
        }
      }
      if (subjectType === "practical" || subjectType === "both") {
        const ep = getExportVal(evaluation?.finalPracticalMarks);
        row["Eval_Practical"] = ep;
        row["Eval_Practical_Max"] = practicalMax;
        if (ep === null) {
          errors.push(`${student.fullName}: missing evaluation practical marks`);
          rowValid = false;
        }
      }
      const evalTheory = getNumericVal(evaluation?.finalTheoryMarks);
      const evalPractical = getNumericVal(evaluation?.finalPracticalMarks);
      row["Eval_Total"] = evalTheory + evalPractical;

      rows.push(row);
    }

    if (download) {
      if (errors.length > 0) {
        return err("Validation errors exist. Fix before downloading.", 422);
      }

      // Build CSV
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => row[h] ?? "").join(",")),
      ];
      const csvText = csvLines.join("\n");

      return new NextResponse(csvText, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="internal_marks_${subjectCode}_${assignment.divisionName}.csv"`,
        },
      });
    }

    // Preview mode
    return ok({
      rows,
      errors,
      validCount: rows.length - errors.length,
      totalCount: rows.length,
      exams: exams.map((e) => ({ id: e.id, examName: e.examName, examNumber: e.examNumber })),
      subjectType,
      subjectCode,
    });
  } catch (error) {
    console.error("[GET /api/internal-evaluation/export]", error);
    return err("Internal server error", 500);
  }
}
