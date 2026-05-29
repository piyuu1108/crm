import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, examSchedules, examSubjects } from "@/app/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { ExamWizardStep5Schema } from "@/app/lib/validations/schemas/exam-wizard";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * PUT /api/exam-wizard/[id]/schedule
 * Save Step 5: Schedule planning.
 */
export async function PUT(
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
    action: "exams.save_schedule",
    category: "exams",
    summary: "Saved exam schedule",
    entityId: examId,
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, ExamWizardStep5Schema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { slots } = parsed.data;

    // Validate examSubjectIds belong to this exam
    const subjectIds = slots.map((s) => s.examSubjectId);
    const validSubs = await db
      .select({ id: examSubjects.id })
      .from(examSubjects)
      .where(and(eq(examSubjects.examId, examId), inArray(examSubjects.id, subjectIds)));

    if (validSubs.length !== new Set(subjectIds).size) {
      return audit.error("Some subjects are not part of this exam", undefined, 400);
    }

    // Check for duplicate subject scheduling
    const subIdSet = new Set<number>();
    for (const slot of slots) {
      if (subIdSet.has(slot.examSubjectId)) {
        return audit.error("Duplicate subject in schedule", undefined, 400);
      }
      subIdSet.add(slot.examSubjectId);
    }

    await db.transaction(async (tx) => {
      await tx.delete(examSchedules).where(eq(examSchedules.examId, examId));
      if (slots.length > 0) {
        await tx.insert(examSchedules).values(
          slots.map((s) => ({
            examId,
            examDate: s.examDate,
            startTime: s.startTime,
            endTime: s.endTime,
            examSubjectId: s.examSubjectId,
          }))
        );
      }
      await tx
        .update(internalExams)
        .set({
          completedStep: sql`GREATEST(${internalExams.completedStep}, 5)`,
          updatedAt: new Date(),
        })
        .where(eq(internalExams.id, examId));
    });

    return audit.success(
      NextResponse.json({ success: true, data: { saved: slots.length } }),
      { eid: String(examId) }
    );
  } catch (error) {
    return audit.error(error);
  }
}
