import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, examSubjects, examSchedules } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { ExamWizardStep4Schema } from "@/app/lib/validations/schemas/exam-wizard";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * PUT /api/exam-wizard/[id]/subjects
 * Save Step 4: Subject selection.
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
    action: "exams.save_subjects",
    category: "exams",
    summary: "Saved exam subject selections",
    entityId: examId,
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, ExamWizardStep4Schema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { subjects: subjectItems } = parsed.data;

    await db.transaction(async (tx) => {
      // Delete schedules first (FK to examSubjects)
      await tx.delete(examSchedules).where(eq(examSchedules.examId, examId));
      await tx.delete(examSubjects).where(eq(examSubjects.examId, examId));
      if (subjectItems.length > 0) {
        await tx.insert(examSubjects).values(
          subjectItems.map((s) => ({
            examId,
            subjectId: s.subjectId,
            durationMinutes: s.durationMinutes,
          }))
        );
      }
      await tx
        .update(internalExams)
        .set({
          completedStep: sql`GREATEST(${internalExams.completedStep}, 4)`,
          updatedAt: new Date(),
        })
        .where(eq(internalExams.id, examId));
    });

    return audit.success(
      NextResponse.json({ success: true, data: { saved: subjectItems.length } }),
      { eid: String(examId) }
    );
  } catch (error) {
    return audit.error(error);
  }
}
