import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { internalExams, internalExamMarks } from "@/app/lib/schema";
import { eq, count } from "drizzle-orm";

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
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (!rolesArray.includes("hod")) {
      return err("Forbidden: only HOD can update exams", 403);
    }

    const { id } = await params;
    const examId = parseInt(id, 10);
    if (isNaN(examId)) return err("Invalid exam ID", 400);

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
      return err("No valid fields to update", 400);
    }

    const [updated] = await db
      .update(internalExams)
      .set(updateData)
      .where(eq(internalExams.id, examId))
      .returning();

    if (!updated) return err("Exam not found", 404);

    return ok(updated);
  } catch (error) {
    console.error("[PUT /api/internal-exams/[id]]", error);
    return err("Internal server error", 500);
  }
}

/**
 * DELETE /api/internal-exams/[id]
 * Delete exam. HOD only. Only if no marks have been entered.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (!rolesArray.includes("hod")) {
      return err("Forbidden: only HOD can delete exams", 403);
    }

    const { id } = await params;
    const examId = parseInt(id, 10);
    if (isNaN(examId)) return err("Invalid exam ID", 400);

    // Check if marks exist
    const [{ marksCount }] = await db
      .select({ marksCount: count(internalExamMarks.id) })
      .from(internalExamMarks)
      .where(eq(internalExamMarks.internalExamId, examId));

    if (Number(marksCount) > 0) {
      return err("Cannot delete: marks have been entered for this exam", 409);
    }

    const [deleted] = await db
      .delete(internalExams)
      .where(eq(internalExams.id, examId))
      .returning();

    if (!deleted) return err("Exam not found", 404);

    return ok({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/internal-exams/[id]]", error);
    return err("Internal server error", 500);
  }
}
