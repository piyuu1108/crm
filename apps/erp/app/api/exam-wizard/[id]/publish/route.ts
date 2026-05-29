import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, examScopes, examSubjects, examSchedules, examHallAllocations } from "@/app/lib/schema";
import { eq, count } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/exam-wizard/[id]/publish
 * Publish exam — validates all steps complete and transitions status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "exams.manage");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const examId = parseInt(id, 10);
  if (isNaN(examId)) {
    return NextResponse.json({ success: false, error: "Invalid exam ID" }, { status: 400 });
  }

  const audit = AuditLogger.start(req, auth, {
    action: "exams.publish",
    category: "exams",
    summary: "Published exam",
    entityId: examId,
  });

  try {
    const [exam] = await db.select().from(internalExams).where(eq(internalExams.id, examId)).limit(1);
    if (!exam) return audit.error("Exam not found", undefined, 404);
    if (exam.status !== "draft") {
      return audit.error("Only draft exams can be published", undefined, 409);
    }

    // Validate completeness
    const errors: string[] = [];

    const [{ scopeCount }] = await db
      .select({ scopeCount: count(examScopes.id) })
      .from(examScopes)
      .where(eq(examScopes.examId, examId));
    if (Number(scopeCount) === 0) errors.push("No target scope defined (Step 2)");

    const [{ subCount }] = await db
      .select({ subCount: count(examSubjects.id) })
      .from(examSubjects)
      .where(eq(examSubjects.examId, examId));
    if (Number(subCount) === 0) errors.push("No subjects selected (Step 4)");

    const [{ schedCount }] = await db
      .select({ schedCount: count(examSchedules.id) })
      .from(examSchedules)
      .where(eq(examSchedules.examId, examId));
    if (Number(schedCount) === 0) errors.push("No schedule created (Step 5)");

    const [{ hallCount }] = await db
      .select({ hallCount: count(examHallAllocations.id) })
      .from(examHallAllocations)
      .where(eq(examHallAllocations.examId, examId));
    if (Number(hallCount) === 0) errors.push("No halls allocated (Step 6)");

    if (errors.length > 0) {
      return audit.error(
        "Incomplete exam",
        NextResponse.json({ success: false, error: "Exam is incomplete", errors }, { status: 400 })
      );
    }

    const [updated] = await db
      .update(internalExams)
      .set({
        status: "scheduled",
        completedStep: 7,
        updatedAt: new Date(),
      })
      .where(eq(internalExams.id, examId))
      .returning();

    return audit.success(
      NextResponse.json({ success: true, data: updated }),
      { eid: String(examId) }
    );
  } catch (error) {
    return audit.error(error);
  }
}
