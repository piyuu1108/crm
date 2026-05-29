import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, examScopes, divisions } from "@/app/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { ExamWizardStep2Schema } from "@/app/lib/validations/schemas/exam-wizard";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * PUT /api/exam-wizard/[id]/scope
 * Save Step 2: Target Scope (divisions).
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
    action: "exams.save_scope",
    category: "exams",
    summary: "Saved exam scope selections",
    entityId: examId,
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, ExamWizardStep2Schema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { divisionIds } = parsed.data;

    // Validate divisions exist and get year labels
    const divs = await db.select().from(divisions).where(inArray(divisions.id, divisionIds));
    if (divs.length !== divisionIds.length) {
      return audit.error("Some divisions not found", undefined, 400);
    }

    // Derive year label from semesterNo: sem 1,2 = year 1, sem 3,4 = year 2, etc.
    const scopeRows = divs.map((d) => ({
      examId,
      divisionId: d.id,
      yearLabel: Math.ceil(d.semesterNo / 2),
    }));

    await db.transaction(async (tx) => {
      await tx.delete(examScopes).where(eq(examScopes.examId, examId));
      if (scopeRows.length > 0) {
        await tx.insert(examScopes).values(scopeRows);
      }
      await tx
        .update(internalExams)
        .set({
          completedStep: sql`GREATEST(${internalExams.completedStep}, 2)`,
          updatedAt: new Date(),
        })
        .where(eq(internalExams.id, examId));
    });

    return audit.success(
      NextResponse.json({ success: true, data: { saved: scopeRows.length } }),
      { eid: String(examId), divs: divisionIds.length }
    );
  } catch (error) {
    return audit.error(error);
  }
}
