import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  internalExams,
  examScopes,
  examEligibilityRules,
  examSubjects,
  examSchedules,
  examHallAllocations,
  divisions,
  subjects,
  classrooms,
  classroomBenches,
  students,
} from "@/app/lib/schema";
import { eq, and, inArray, count, sum, sql } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { ExamWizardStep1Schema } from "@/app/lib/validations/schemas/exam-wizard";

export const dynamic = "force-dynamic";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

/**
 * GET /api/exam-wizard/[id]
 * Load full exam draft with all step data.
 */
export async function GET(
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

  try {
    const [exam] = await db.select().from(internalExams).where(eq(internalExams.id, examId)).limit(1);
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    // Load all step data in parallel
    const [scopes, eligibility, examSubs, schedules, halls] = await Promise.all([
      db.select().from(examScopes).where(eq(examScopes.examId, examId)),
      db.select().from(examEligibilityRules).where(eq(examEligibilityRules.examId, examId)),
      db.select().from(examSubjects).where(eq(examSubjects.examId, examId)),
      db.select().from(examSchedules).where(eq(examSchedules.examId, examId)),
      db.select().from(examHallAllocations).where(eq(examHallAllocations.examId, examId)).orderBy(examHallAllocations.sequenceOrder),
    ]);

    // Enrich scopes with division details
    let enrichedScopes: any[] = [];
    if (scopes.length > 0) {
      const divIds = scopes.map((s) => s.divisionId);
      const divs = await db.select().from(divisions).where(inArray(divisions.id, divIds));
      const divMap = new Map(divs.map((d) => [d.id, d]));

      // Count students per division
      const studentCounts = await db
        .select({ divId: students.currentDivisionId, cnt: count(students.id) })
        .from(students)
        .where(and(inArray(students.currentDivisionId, divIds), eq(students.status, "approved")))
        .groupBy(students.currentDivisionId);
      const countMap = new Map(studentCounts.map((s) => [s.divId, Number(s.cnt)]));

      enrichedScopes = scopes.map((s) => {
        const div = divMap.get(s.divisionId);
        return {
          ...s,
          displayName: div?.displayName || "",
          semesterNo: div?.semesterNo || 0,
          batchYear: div?.batchYear || 0,
          specialization: div?.specialization || "",
          studentCount: countMap.get(s.divisionId) || 0,
        };
      });
    }

    // Enrich subjects
    let enrichedSubjects: any[] = [];
    if (examSubs.length > 0) {
      const subIds = examSubs.map((s) => s.subjectId);
      const subs = await db.select().from(subjects).where(inArray(subjects.id, subIds));
      const subMap = new Map(subs.map((s) => [s.id, s]));
      enrichedSubjects = examSubs.map((es) => {
        const sub = subMap.get(es.subjectId);
        return {
          ...es,
          subjectName: sub?.name || "",
          subjectCode: sub?.code || "",
          shortCode: sub?.shortCode || "",
          subjectType: sub?.subjectType || "",
          credit: sub?.credit || 0,
          semester: sub?.semester || 0,
        };
      });
    }

    // Enrich halls
    let enrichedHalls: any[] = [];
    if (halls.length > 0) {
      const roomIds = halls.map((h) => h.classroomId);
      const rooms = await db.select().from(classrooms).where(inArray(classrooms.id, roomIds));
      const roomMap = new Map(rooms.map((r) => [r.id, r]));

      // Get bench counts
      const benchData = await db
        .select({
          classroomId: classroomBenches.classroomId,
          totalBenches: count(classroomBenches.id),
          totalCapacity: sum(classroomBenches.maxStudents),
        })
        .from(classroomBenches)
        .where(and(inArray(classroomBenches.classroomId, roomIds), eq(classroomBenches.isActive, true)))
        .groupBy(classroomBenches.classroomId);
      const benchMap = new Map(benchData.map((b) => [b.classroomId, b]));

      enrichedHalls = halls.map((h) => {
        const room = roomMap.get(h.classroomId);
        const bench = benchMap.get(h.classroomId);
        return {
          ...h,
          roomCode: room?.roomCode || "",
          floor: room?.floor || "",
          lectureCapacity: room?.lectureCapacity || 0,
          totalBenches: Number(bench?.totalBenches || 0),
          benchCapacity: Number(bench?.totalCapacity || 0),
        };
      });
    }

    // Compute summary
    const totalStudents = enrichedScopes.reduce((sum: number, s: any) => sum + s.studentCount, 0);
    const uniqueYears = [...new Set(enrichedScopes.map((s: any) => s.yearLabel))];

    return ok({
      exam,
      scopes: enrichedScopes,
      eligibility,
      subjects: enrichedSubjects,
      schedules,
      halls: enrichedHalls,
      summary: {
        totalStudents,
        divisionCount: scopes.length,
        subjectCount: examSubs.length,
        years: uniqueYears,
        scheduledCount: schedules.length,
        hallCount: halls.length,
      },
    });
  } catch (error) {
    console.error("[GET /api/exam-wizard/[id]]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/exam-wizard/[id]
 * Update Step 1 basic details.
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
    action: "exams.update_draft",
    category: "exams",
    summary: "Updated exam draft basic details",
    entityId: examId,
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, ExamWizardStep1Schema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { examName, examNumber, description, examType } = parsed.data;

    const [updated] = await db
      .update(internalExams)
      .set({
        examName: examName.trim(),
        examNumber,
        description: description || null,
        examType,
        completedStep: sql`GREATEST(${internalExams.completedStep}, 1)`,
        updatedAt: new Date(),
      })
      .where(eq(internalExams.id, examId))
      .returning();

    if (!updated) return audit.error("Exam not found", undefined, 404);

    return audit.success(ok(updated), { eid: String(examId) });
  } catch (error) {
    return audit.error(error);
  }
}

/**
 * DELETE /api/exam-wizard/[id]
 * Delete a draft exam.
 */
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
    action: "exams.delete_draft",
    category: "exams",
    summary: "Deleted exam draft",
    entityId: examId,
  });

  try {
    const [exam] = await db.select().from(internalExams).where(eq(internalExams.id, examId)).limit(1);
    if (!exam) return audit.error("Exam not found", undefined, 404);

    if (exam.status !== "draft") {
      return audit.error("Only draft exams can be deleted", undefined, 409);
    }

    await db.delete(internalExams).where(eq(internalExams.id, examId));

    return audit.success(ok({ deleted: true }), { eid: String(examId) });
  } catch (error) {
    return audit.error(error);
  }
}
