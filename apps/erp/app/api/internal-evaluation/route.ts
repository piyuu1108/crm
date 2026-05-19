import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  internalEvaluations,
  internalExamMarks,
  internalExams,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  students,
  subjects,
  semesters,
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

async function canAccessAssignment(
  resolvedRole: string,
  userId: number,
  assignmentId: number
): Promise<boolean> {
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

  if (resolvedRole === "faculty") return assignment.facultyId === userId;

  if (resolvedRole === "counselor") {
    const counselorDivs = await db
      .select({ divisionId: counselorDivisionAssignments.divisionId })
      .from(counselorDivisionAssignments)
      .where(eq(counselorDivisionAssignments.facultyId, userId));
    return counselorDivs.some((d) => d.divisionId === assignment.divisionId);
  }

  return false;
}

/**
 * GET /api/internal-evaluation
 * Fetch evaluation data: all raw exam marks + current final evaluation for an assignment.
 * Query: ?assignmentId=...&semesterId=...
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

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

    if (!assignmentId) return err("assignmentId is required", 400);

    if (!(await canAccessAssignment(resolvedRole, payload.userId, assignmentId))) {
      return err("Forbidden: no access to this assignment", 403);
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
        divisionId: facultySubjectAssignments.divisionId,
        divisionName: divisions.displayName,
      })
      .from(facultySubjectAssignments)
      .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .where(eq(facultySubjectAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return err("Assignment not found", 404);

    // Get max marks from subjects
    const [subject] = await db
      .select({
        internalTheoryMax: subjects.internalTheoryMax,
        internalPracticalMax: subjects.internalPracticalMax,
      })
      .from(subjects)
      .where(eq(subjects.id, assignment.subjectId))
      .limit(1);

    // Get all exams for this semester
    const exams = await db
      .select()
      .from(internalExams)
      .where(eq(internalExams.semesterId, semesterId))
      .orderBy(internalExams.examNumber);

    // Get all raw marks for this assignment across all exams
    const rawMarks = await db
      .select()
      .from(internalExamMarks)
      .where(eq(internalExamMarks.assignmentId, assignmentId));

    // Get existing evaluations
    const evaluations = await db
      .select()
      .from(internalEvaluations)
      .where(
        and(
          eq(internalEvaluations.assignmentId, assignmentId),
          eq(internalEvaluations.semesterId, semesterId)
        )
      );

    // Get students in the division
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
      assignment,
      exams,
      rawMarks,
      evaluations,
      students: divisionStudents,
      maxMarks: {
        theory: subject?.internalTheoryMax ?? null,
        practical: subject?.internalPracticalMax ?? null,
      },
      semesterId,
    });
  } catch (error) {
    console.error("[GET /api/internal-evaluation]", error);
    return err("Internal server error", 500);
  }
}

/**
 * POST /api/internal-evaluation
 * Batch upsert final evaluation marks.
 * Body: { assignmentId, semesterId, records: [{ studentId, finalTheoryMarks?, finalPracticalMarks?, studentName, subjectName, subjectType, divisionName }] }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

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

    const body = await req.json();
    const { assignmentId, semesterId, records } = body;

    if (!assignmentId || !semesterId || !Array.isArray(records) || records.length === 0) {
      return err("assignmentId, semesterId, and non-empty records are required", 400);
    }

    if (!(await canAccessAssignment(resolvedRole, payload.userId, assignmentId))) {
      return err("Forbidden: no access to this assignment", 403);
    }

    // Check if already finalized (only HOD can override)
    const existing = await db
      .select({ isFinalized: internalEvaluations.isFinalized })
      .from(internalEvaluations)
      .where(
        and(
          eq(internalEvaluations.assignmentId, assignmentId),
          eq(internalEvaluations.semesterId, semesterId)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].isFinalized && resolvedRole !== "hod") {
      return err("Evaluation is finalized. Only HOD can override.", 403);
    }

    // Batch upsert
    const values = records.map(
      (r: {
        studentId: number;
        finalTheoryMarks: number | null;
        finalPracticalMarks: number | null;
        studentName: string;
        subjectName: string;
        subjectType: string;
        divisionName: string;
      }) =>
        sql`(${assignmentId}, ${r.studentId}, ${semesterId}, ${r.finalTheoryMarks}, ${r.finalPracticalMarks}, false, ${r.studentName}, ${r.subjectName}, ${r.subjectType}, ${r.divisionName}, ${payload.userId}, NOW())`
    );

    await db.execute(sql`
      INSERT INTO internal_evaluations
        (assignment_id, student_id, semester_id, final_theory_marks, final_practical_marks, is_finalized, student_name, subject_name, subject_type, division_name, updated_by_faculty_id, updated_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (assignment_id, student_id, semester_id)
      DO UPDATE SET
        final_theory_marks = EXCLUDED.final_theory_marks,
        final_practical_marks = EXCLUDED.final_practical_marks,
        updated_by_faculty_id = EXCLUDED.updated_by_faculty_id,
        updated_at = NOW()
    `);

    return ok({ saved: records.length });
  } catch (error) {
    console.error("[POST /api/internal-evaluation]", error);
    return err("Internal server error", 500);
  }
}
