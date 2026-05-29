import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, examHallAllocations, classrooms } from "@/app/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { ExamWizardStep6Schema } from "@/app/lib/validations/schemas/exam-wizard";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * PUT /api/exam-wizard/[id]/halls
 * Save Step 6: Hall allocation ordering.
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
    action: "exams.save_halls",
    category: "exams",
    summary: "Saved exam hall allocations",
    entityId: examId,
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, ExamWizardStep6Schema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { allocations } = parsed.data;

    // Validate classrooms exist
    const roomIds = allocations.map((a) => a.classroomId);
    const rooms = await db.select({ id: classrooms.id }).from(classrooms).where(inArray(classrooms.id, roomIds));
    if (rooms.length !== new Set(roomIds).size) {
      return audit.error("Some classrooms not found", undefined, 400);
    }

    await db.transaction(async (tx) => {
      await tx.delete(examHallAllocations).where(eq(examHallAllocations.examId, examId));
      if (allocations.length > 0) {
        await tx.insert(examHallAllocations).values(
          allocations.map((a) => ({
            examId,
            classroomId: a.classroomId,
            sequenceOrder: a.sequenceOrder,
          }))
        );
      }
      await tx
        .update(internalExams)
        .set({
          completedStep: sql`GREATEST(${internalExams.completedStep}, 6)`,
          updatedAt: new Date(),
        })
        .where(eq(internalExams.id, examId));
    });

    return audit.success(
      NextResponse.json({ success: true, data: { saved: allocations.length } }),
      { eid: String(examId) }
    );
  } catch (error) {
    return audit.error(error);
  }
}
