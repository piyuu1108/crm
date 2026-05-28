import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, internalExamMarks } from "@/app/lib/schema";
import { eq, count } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * PUT /api/internal-exams/[id]
 * Update exam details. HOD only.
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
    action: "exams.update",
    category: "exams",
    summary: "Updated internal exam definition details",
    entityType: "internal_exam",
    entityId: examId,
  });

  try {
    const body = await req.json();
    const { examName, examNumber, targetType, targetYear, targetDivisionId } = body;

    const updateData: Record<string, unknown> = {};
    if (examName) updateData.examName = examName.trim();
    if (typeof examNumber === "number") updateData.examNumber = examNumber;
    if (targetType && ["ALL", "YEAR", "DIVISION"].includes(targetType)) {
      updateData.targetType = targetType;
      updateData.targetYear = targetType === "YEAR" ? targetYear : null;
      updateData.targetDivisionId = targetType === "DIVISION" ? targetDivisionId : null;
    }

    if (Object.keys(updateData).length === 0) {
      return audit.error("No valid fields to update", undefined, 400);
    }

    const [updated] = await db
      .update(internalExams)
      .set(updateData)
      .where(eq(internalExams.id, examId))
      .returning();

    if (!updated) return audit.error("Exam not found", undefined, 404);

    return audit.success(
      NextResponse.json({ success: true, data: updated }),
      {
        eid: String(examId),
        name: updated.examName,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}

export async function DELETE(
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
    action: "exams.delete",
    category: "exams",
    summary: "Deleted internal exam definition",
    entityType: "internal_exam",
    entityId: examId,
  });

  try {
    // Check if marks exist
    const [{ marksCount }] = await db
      .select({ marksCount: count(internalExamMarks.id) })
      .from(internalExamMarks)
      .where(eq(internalExamMarks.internalExamId, examId));

    if (Number(marksCount) > 0) {
      return audit.error("Cannot delete: marks have been entered for this exam", undefined, 409);
    }

    const [deleted] = await db
      .delete(internalExams)
      .where(eq(internalExams.id, examId))
      .returning();

    if (!deleted) return audit.error("Exam not found", undefined, 404);

    return audit.success(
      NextResponse.json({ success: true, data: { deleted: true } }),
      {
        eid: String(examId),
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
