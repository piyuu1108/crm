import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  students,
  divisions,
  semesters,
  academicYears,
  studentEnrollmentHistory,
} from "@/app/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { redis } from "@/app/lib/redis";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── Auth guard (HOD only) ────────────────────────────────────────────────────
async function authorizeHod() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── POST /api/admin/promotion — Promote students between semesters ───────────
//
// Transaction flow:
//   1. Archive old enrollment (active → archived)
//   2. Insert new active enrollment row
//   3. Update students.current_* snapshot fields
//
// Body:
//   {
//     sourceDivisionId: number,     // current division
//     targetDivisionId: number,     // next semester division
//     studentIds?: number[]         // optional: specific students (default: all in source)
//   }
//
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeHod();
    if ("error" in auth && auth.error) return auth.error;

    const body = await req.json();
    const { sourceDivisionId, targetDivisionId, studentIds } = body;

    // ── Input validation ──────────────────────────────────────────────
    if (!sourceDivisionId || typeof sourceDivisionId !== "number") {
      return err("sourceDivisionId is required and must be a number", 400);
    }
    if (!targetDivisionId || typeof targetDivisionId !== "number") {
      return err("targetDivisionId is required and must be a number", 400);
    }
    if (sourceDivisionId === targetDivisionId) {
      return err("Source and target divisions must be different", 400);
    }

    // ── Fetch source division ─────────────────────────────────────────
    const [sourceDivision] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, sourceDivisionId))
      .limit(1);

    if (!sourceDivision) return err("Source division not found", 404);

    // ── Fetch target division ─────────────────────────────────────────
    const [targetDivision] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, targetDivisionId))
      .limit(1);

    if (!targetDivision) return err("Target division not found", 404);

    // ── Validate semester progression ─────────────────────────────────
    // Target must be exactly one semester ahead of source
    if (targetDivision.semesterNo !== sourceDivision.semesterNo + 1) {
      return err(
        `Invalid promotion: source is Sem ${sourceDivision.semesterNo}, ` +
        `target must be Sem ${sourceDivision.semesterNo + 1} but got Sem ${targetDivision.semesterNo}`,
        400
      );
    }

    // ── Resolve academic year for the target semester ──────────────────
    const [targetSemester] = await db
      .select({ academicYearId: semesters.academicYearId })
      .from(semesters)
      .where(eq(semesters.id, targetDivision.semesterId))
      .limit(1);

    let academicYearId = targetSemester?.academicYearId;

    // Fallback: use current academic year if semester has no year linked
    if (!academicYearId) {
      const [currentYear] = await db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(eq(academicYears.isCurrent, true))
        .limit(1);
      academicYearId = currentYear?.id ?? null;
    }

    if (!academicYearId) {
      return err("No academic year found. Create an academic year first.", 400);
    }

    // ── Fetch students to promote ─────────────────────────────────────
    let studentsToPromote: { id: number; fullName: string }[];

    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      // Specific students — validate they belong to source division
      studentsToPromote = await db
        .select({ id: students.id, fullName: students.fullName })
        .from(students)
        .where(
          and(
            inArray(students.id, studentIds),
            eq(students.currentDivisionId, sourceDivisionId)
          )
        );

      if (studentsToPromote.length !== studentIds.length) {
        const foundIds = new Set(studentsToPromote.map((s) => s.id));
        const missingIds = studentIds.filter((id: number) => !foundIds.has(id));
        return err(
          `Students not found in source division: ${missingIds.join(", ")}`,
          400
        );
      }
    } else {
      // All students in the source division
      studentsToPromote = await db
        .select({ id: students.id, fullName: students.fullName })
        .from(students)
        .where(eq(students.currentDivisionId, sourceDivisionId));
    }

    if (studentsToPromote.length === 0) {
      return err("No students found in source division to promote", 400);
    }

    // ── Check target capacity ─────────────────────────────────────────
    const [currentCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(students)
      .where(eq(students.currentDivisionId, targetDivisionId));

    const currentStudentsInTarget = Number(currentCount?.count ?? 0);
    const remainingCapacity = targetDivision.maxCapacity - currentStudentsInTarget;

    if (studentsToPromote.length > remainingCapacity) {
      return err(
        `Target division capacity exceeded: ${remainingCapacity} slots available, ` +
        `${studentsToPromote.length} students to promote`,
        400
      );
    }

    // ── Execute promotion in a transaction ─────────────────────────────
    const studentIdList = studentsToPromote.map((s) => s.id);

    await db.transaction(async (tx) => {
      // Step 1: Archive old enrollment records (active → archived)
      await tx
        .update(studentEnrollmentHistory)
        .set({
          status: "archived",
          archivedAt: new Date(),
        })
        .where(
          and(
            inArray(studentEnrollmentHistory.studentId, studentIdList),
            eq(studentEnrollmentHistory.status, "active")
          )
        );

      // Step 2: Insert new active enrollment rows
      await tx.insert(studentEnrollmentHistory).values(
        studentsToPromote.map((s) => ({
          studentId: s.id,
          semesterId: targetDivision.semesterId,
          divisionId: targetDivisionId,
          academicYearId: academicYearId!,
          semesterNo: targetDivision.semesterNo,
          divisionName: targetDivision.displayName,
          status: "active",
        }))
      );

      // Step 3: Update students.current_* snapshot fields
      await tx
        .update(students)
        .set({
          currentSemesterNo: targetDivision.semesterNo,
          currentDivisionId: targetDivisionId,
          currentDivisionName: targetDivision.displayName,
        })
        .where(inArray(students.id, studentIdList));
    });

    // ── Invalidate relevant caches ────────────────────────────────────
    try {
      const cachePatterns = [
        "divisions:*",
        "dashboard:*",
      ];
      for (const pattern of cachePatterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (redisError) {
      console.warn("[Promotion] Cache invalidation failed:", redisError);
    }

    return ok({
      promoted: studentsToPromote.length,
      from: {
        divisionId: sourceDivisionId,
        displayName: sourceDivision.displayName,
        semesterNo: sourceDivision.semesterNo,
      },
      to: {
        divisionId: targetDivisionId,
        displayName: targetDivision.displayName,
        semesterNo: targetDivision.semesterNo,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/promotion] Error:", error);
    return err("Internal server error", 500);
  }
}
