import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  internalEvaluations,
  facultySubjectAssignments,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { EvaluationFinalizeSchema } from "@/app/lib/validations/schemas/exam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * PUT /api/internal-evaluation/finalize
 * Toggle is_finalized for an assignment's evaluations.
 * Body: { assignmentId, semesterId, finalize } — finalize = true | false
 * Only HOD can un-finalize (finalize = false).
 * Faculty can finalize their own assignments.
 */
export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "exams.evaluate");
  if (auth instanceof NextResponse) return auth;

  const { userId, activeRole: resolvedRole } = auth;

  const audit = AuditLogger.start(req, auth, {
    action: "evaluation.finalize",
    category: "evaluation",
    summary: "Finalized/unfinalized internal evaluations",
    entityType: "internal_evaluation",
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, EvaluationFinalizeSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { assignmentId, semesterId, finalize } = parsed.data;

    // Un-finalize requires HOD
    if (!finalize && resolvedRole !== "hod") {
      return audit.error("Forbidden: only HOD can un-finalize evaluations", undefined, 403);
    }

    // RBAC — faculty can only finalize own assignments
    if (resolvedRole === "faculty") {
      const [assignment] = await db
        .select({ facultyId: facultySubjectAssignments.facultyId })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.id, assignmentId))
        .limit(1);

      if (!assignment || assignment.facultyId !== userId) {
        return audit.error("Forbidden: not your assignment", undefined, 403);
      }
    }

    // Update all evaluations for this assignment + semester
    await db
      .update(internalEvaluations)
      .set({
        isFinalized: finalize,
        finalizedByFacultyId: finalize ? userId : null,
        finalizedAt: finalize ? new Date() : null,
      })
      .where(
        and(
          eq(internalEvaluations.assignmentId, assignmentId),
          eq(internalEvaluations.semesterId, semesterId)
        )
      );

    return audit.success(
      NextResponse.json({ success: true, data: { assignmentId, semesterId, finalized: finalize } }),
      {
        asid: String(assignmentId),
        sem: String(semesterId),
        fin: finalize,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
