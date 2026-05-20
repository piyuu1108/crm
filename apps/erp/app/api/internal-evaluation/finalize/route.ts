import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  internalEvaluations,
  facultySubjectAssignments,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

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
  try {
    const auth = await getAuthContext(req);
    if (!auth) return err("Unauthorized", 401);

    const { userId, roles: rolesArray, activeRole: resolvedRole } = auth;

    if (!["faculty", "hod"].includes(resolvedRole)) {
      return err("Forbidden: only faculty and HOD can finalize", 403);
    }

    const body = await req.json();
    const { assignmentId, semesterId, finalize } = body;

    if (!assignmentId || !semesterId || typeof finalize !== "boolean") {
      return err("assignmentId, semesterId, and finalize (boolean) are required", 400);
    }

    // Un-finalize requires HOD
    if (!finalize && resolvedRole !== "hod") {
      return err("Forbidden: only HOD can un-finalize evaluations", 403);
    }

    // RBAC — faculty can only finalize own assignments
    if (resolvedRole === "faculty") {
      const [assignment] = await db
        .select({ facultyId: facultySubjectAssignments.facultyId })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.id, assignmentId))
        .limit(1);

      if (!assignment || assignment.facultyId !== userId) {
        return err("Forbidden: not your assignment", 403);
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

    return ok({ assignmentId, semesterId, finalized: finalize });
  } catch (error) {
    console.error("[PUT /api/internal-evaluation/finalize]", error);
    return err("Internal server error", 500);
  }
}
