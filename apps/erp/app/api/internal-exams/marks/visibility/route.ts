import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  internalExamMarks,
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
 * PUT /api/internal-exams/marks/visibility
 * Toggle is_visible for all marks of an exam + assignment.
 * Body: { examId, assignmentId, isVisible }
 */
export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    const activeRole = req.headers.get("X-Active-Role") ?? null;
    const ROLE_PRIORITY = ["hod", "counselor", "faculty"];
    const resolvedRole =
      activeRole && rolesArray.includes(activeRole)
        ? activeRole
        : ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const body = await req.json();
    const { examId, assignmentId, isVisible } = body;

    if (!examId || !assignmentId || typeof isVisible !== "boolean") {
      return err("examId, assignmentId, and isVisible (boolean) are required", 400);
    }

    // RBAC
    if (resolvedRole !== "hod") {
      const [assignment] = await db
        .select({
          facultyId: facultySubjectAssignments.facultyId,
          divisionId: facultySubjectAssignments.divisionId,
        })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.id, assignmentId))
        .limit(1);

      if (!assignment) return err("Assignment not found", 404);

      if (resolvedRole === "faculty" && assignment.facultyId !== payload.userId) {
        return err("Forbidden: not your assignment", 403);
      }

      if (resolvedRole === "counselor") {
        const counselorDivs = await db
          .select({ divisionId: counselorDivisionAssignments.divisionId })
          .from(counselorDivisionAssignments)
          .where(eq(counselorDivisionAssignments.facultyId, payload.userId));
        if (!counselorDivs.some((d) => d.divisionId === assignment.divisionId)) {
          return err("Forbidden: not your division", 403);
        }
      }
    }

    // Update all marks for this exam + assignment
    await db
      .update(internalExamMarks)
      .set({ isVisible })
      .where(
        and(
          eq(internalExamMarks.internalExamId, examId),
          eq(internalExamMarks.assignmentId, assignmentId)
        )
      );

    return ok({ examId, assignmentId, isVisible });
  } catch (error) {
    console.error("[PUT /api/internal-exams/marks/visibility]", error);
    return err("Internal server error", 500);
  }
}
