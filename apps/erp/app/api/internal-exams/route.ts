import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { internalExams, semesters } from "@/app/lib/schema";
import { eq, and, desc, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/internal-exams
 * List internal exams for a semester.
 * Query: ?semesterId=...
 * Students see only exams matching their scope.
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const semesterIdParam = searchParams.get("semesterId");

    let semesterId: number;
    if (semesterIdParam) {
      semesterId = parseInt(semesterIdParam, 10);
    } else {
      // Find the active semester
      const [activeSem] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.isActive, true))
        .limit(1);
      if (!activeSem) return err("No active semester found", 404);
      semesterId = activeSem.id;
    }

    const exams = await db
      .select()
      .from(internalExams)
      .where(eq(internalExams.semesterId, semesterId))
      .orderBy(internalExams.examNumber);

    return ok({ exams, semesterId });
  } catch (error) {
    console.error("[GET /api/internal-exams]", error);
    return err("Internal server error", 500);
  }
}

/**
 * POST /api/internal-exams
 * Create a new internal exam. HOD only.
 * Body: { examName, examNumber, targetType, targetYear?, targetDivisionId?, semesterId? }
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (!rolesArray.includes("hod")) {
      return err("Forbidden: only HOD can create exams", 403);
    }

    const body = await req.json();
    const { examName, examNumber, targetType, targetYear, targetDivisionId, semesterId: reqSemId } = body;

    if (!examName || typeof examNumber !== "number") {
      return err("examName and examNumber are required", 400);
    }
    if (!["ALL", "YEAR", "DIVISION"].includes(targetType || "ALL")) {
      return err("targetType must be ALL, YEAR, or DIVISION", 400);
    }
    if (targetType === "YEAR" && !targetYear) {
      return err("targetYear is required when targetType is YEAR", 400);
    }
    if (targetType === "DIVISION" && !targetDivisionId) {
      return err("targetDivisionId is required when targetType is DIVISION", 400);
    }

    let semesterId: number;
    if (reqSemId) {
      semesterId = reqSemId;
    } else {
      const [activeSem] = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.isActive, true))
        .limit(1);
      if (!activeSem) return err("No active semester found", 404);
      semesterId = activeSem.id;
    }

    const [created] = await db
      .insert(internalExams)
      .values({
        semesterId,
        examName: examName.trim(),
        examNumber,
        targetType: targetType || "ALL",
        targetYear: targetType === "YEAR" ? targetYear : null,
        targetDivisionId: targetType === "DIVISION" ? targetDivisionId : null,
        createdByFacultyId: payload.userId,
      })
      .returning();

    return ok(created);
  } catch (error) {
    console.error("[POST /api/internal-exams]", error);
    return err("Internal server error", 500);
  }
}
