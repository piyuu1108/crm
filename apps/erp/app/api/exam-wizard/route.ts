import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  internalExams,
  examScopes,
  examSubjects,
  semesters,
} from "@/app/lib/schema";
import { eq, and, inArray, sql, count, sum } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { CreateExamDraftSchema } from "@/app/lib/validations/schemas/exam-wizard";

export const dynamic = "force-dynamic";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

/**
 * GET /api/exam-wizard
 * List draft + all exams for the wizard listing page.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "exams.manage");
  if (auth instanceof NextResponse) return auth;

  try {
    const [activeSem] = await db
      .select({ id: semesters.id })
      .from(semesters)
      .where(eq(semesters.isActive, true))
      .limit(1);

    if (!activeSem) {
      return NextResponse.json({ success: false, error: "No active semester" }, { status: 404 });
    }

    const exams = await db
      .select()
      .from(internalExams)
      .where(eq(internalExams.semesterId, activeSem.id))
      .orderBy(internalExams.examNumber);

    // For each exam, get scope count, subject count
    const examIds = exams.map((e) => e.id);
    let scopeCounts: Record<number, number> = {};
    let subjectCounts: Record<number, number> = {};

    if (examIds.length > 0) {
      const scopes = await db
        .select({ examId: examScopes.examId, cnt: count(examScopes.id) })
        .from(examScopes)
        .where(inArray(examScopes.examId, examIds))
        .groupBy(examScopes.examId);
      scopes.forEach((s) => { scopeCounts[s.examId] = Number(s.cnt); });

      const subs = await db
        .select({ examId: examSubjects.examId, cnt: count(examSubjects.id) })
        .from(examSubjects)
        .where(inArray(examSubjects.examId, examIds))
        .groupBy(examSubjects.examId);
      subs.forEach((s) => { subjectCounts[s.examId] = Number(s.cnt); });
    }

    const enriched = exams.map((e) => ({
      ...e,
      divisionCount: scopeCounts[e.id] || 0,
      subjectCount: subjectCounts[e.id] || 0,
    }));

    return ok({ exams: enriched, semesterId: activeSem.id });
  } catch (error) {
    console.error("[GET /api/exam-wizard]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/exam-wizard
 * Create a new exam draft (Step 1).
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "exams.manage");
  if (auth instanceof NextResponse) return auth;

  const audit = AuditLogger.start(req, auth, {
    action: "exams.create_draft",
    category: "exams",
    summary: "Created exam draft",
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, CreateExamDraftSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { examName, examNumber, description, examType, semesterId: reqSemId, academicYearId } = parsed.data;

    let semesterId: number;
    if (reqSemId) {
      semesterId = reqSemId;
    } else {
      const [activeSem] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.isActive, true))
        .limit(1);
      if (!activeSem) return audit.error("No active semester found", undefined, 404);
      semesterId = activeSem.id;
    }

    const [created] = await db
      .insert(internalExams)
      .values({
        semesterId,
        academicYearId: academicYearId || null,
        examName: examName.trim(),
        examNumber,
        description: description || null,
        examType: examType || "internal",
        status: "draft",
        completedStep: 1,
        targetType: "ALL",
        createdByFacultyId: auth.userId,
      })
      .returning();

    return audit.success(ok(created), { eid: String(created.id) });
  } catch (error) {
    return audit.error(error);
  }
}
