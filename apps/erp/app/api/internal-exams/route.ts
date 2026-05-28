import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, semesters } from "@/app/lib/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { CreateInternalExamSchema } from "@/app/lib/validations/schemas/exam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/internal-exams
 * List internal exams for a semester.
 * Query: ?semesterId=...
 * Students see only exams matching their scope.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "exams.view");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const semesterIdParam = searchParams.get("semesterId");

    let semesterId: number;
    if (semesterIdParam) {
      semesterId = parseInt(semesterIdParam, 10);
    } else {
      // Find the active semester
      const [activeSem] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.isActive, true))
        .limit(1);
      if (!activeSem) return err("No active semester found", 404);
      semesterId = activeSem.id;
    }

    const exams = await db
      .select()
      .from(internalExams)
      .where(eq(internalExams.semesterId, semesterId))
      .orderBy(internalExams.examNumber);

    return ok({ exams, semesterId });
  } catch (error) {
    console.error("[GET /api/internal-exams]", error);
    return err("Internal server error", 500);
  }
}

/**
 * POST /api/internal-exams
 * Create a new internal exam. HOD only.
 * Body: { examName, examNumber, targetType, targetYear?, targetDivisionId?, semesterId? }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "exams.manage");
  if (auth instanceof NextResponse) return auth;

  const audit = AuditLogger.start(req, auth, {
    action: "exams.create",
    category: "exams",
    summary: "Created new internal exam definition",
    entityType: "internal_exam",
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, CreateInternalExamSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { examName, examNumber, targetType, targetYear, targetDivisionId, semesterId: reqSemId } = parsed.data;

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
        examName: examName.trim(),
        examNumber,
        targetType: targetType || "ALL",
        targetYear: targetType === "YEAR" ? targetYear : null,
        targetDivisionId: targetType === "DIVISION" ? targetDivisionId : null,
        createdByFacultyId: auth.userId,
      })
      .returning();

    return audit.success(
      NextResponse.json({ success: true, data: created }),
      {
        eid: String(created.id),
        name: created.examName,
        num: created.examNumber,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
