import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, examEligibilityRules } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { ExamWizardStep3Schema } from "@/app/lib/validations/schemas/exam-wizard";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * PUT /api/exam-wizard/[id]/eligibility
 * Save Step 3: Eligibility Rules.
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
    action: "exams.save_eligibility",
    category: "exams",
    summary: "Saved exam eligibility rules",
    entityId: examId,
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, ExamWizardStep3Schema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { rules } = parsed.data;

    await db.transaction(async (tx) => {
      await tx.delete(examEligibilityRules).where(eq(examEligibilityRules.examId, examId));
      if (rules.length > 0) {
        await tx.insert(examEligibilityRules).values(
          rules.map((r) => ({
            examId,
            yearLabel: r.yearLabel,
            minAttendancePercent: r.minAttendancePercent,
            allowApprovalOverride: r.allowApprovalOverride,
            approvalDeadline: r.approvalDeadline || null,
          }))
        );
      }
      await tx
        .update(internalExams)
        .set({
          completedStep: sql`GREATEST(${internalExams.completedStep}, 3)`,
          updatedAt: new Date(),
        })
        .where(eq(internalExams.id, examId));
    });

    return audit.success(
      NextResponse.json({ success: true, data: { saved: rules.length } }),
      { eid: String(examId) }
    );
  } catch (error) {
    return audit.error(error);
  }
}
