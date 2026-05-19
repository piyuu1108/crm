import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { divisions, courses, semesters, students, counselorDivisionAssignments, facultySubjectAssignments, faculty, subjects, academicYears } from "@/app/lib/schema";
import { eq, and, count, asc, desc, sql, max, inArray } from "drizzle-orm";
import { redis } from "@/app/lib/redis";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown, source: "db" | "cache" = "db") {
  return NextResponse.json(
    { success: true, source, data },
    { status: 200, headers: { "X-Cache": source === "cache" ? "HIT" : "MISS" } }
  );
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── Auth guard (JWT double-verification + HOD role check) ────────────────────
async function authorize() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid or expired session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── Specialization code map ──────────────────────────────────────────────────
const SPECIALIZATION_CODES: Record<string, string> = {
  AI: "AI",
  DS: "DS",
  REGULAR: "REG",
};

// ─── GET /api/admin/divisions — Paginated divisions list with student count ───
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get("limit") || "1000", 10)));

    const cacheKey = `divisions:list:page:${page}:limit:${limit}`;

    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return ok(cachedData, "cache");
      }
    } catch (redisError) {
      console.warn("[Redis GET Error] Falling back to DB:", redisError);
    }

    // Count total divisions
    const [totalResult] = await db
      .select({ total: count() })
      .from(divisions);

    const total = totalResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Fetch divisions with student counts
    const rows = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        batchYear: divisions.batchYear,
        semesterNo: divisions.semesterNo,
        divisionNo: divisions.divisionNo,
        courseCode: divisions.courseCode,
        courseName: divisions.courseName,
        maxCapacity: divisions.maxCapacity,
        createdAt: divisions.createdAt,
        studentCount: sql<number>`(SELECT COUNT(*) FROM students WHERE students.current_division_id = ${divisions.id})`.as("student_count"),
      })
      .from(divisions)
      .orderBy(desc(divisions.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch counselor assignments for these divisions
    const divisionIds = rows.map((r) => r.id);
    let counselorMap: Record<number, string> = {};
    let assignmentsMap: Record<number, any[]> = {};

    if (divisionIds.length > 0) {
      const counselors = await db
        .select({
          divisionId: counselorDivisionAssignments.divisionId,
          facultyName: counselorDivisionAssignments.facultyName,
        })
        .from(counselorDivisionAssignments)
        .where(inArray(counselorDivisionAssignments.divisionId, divisionIds));

      for (const c of counselors) {
        // First counselor found for each division
        if (!counselorMap[c.divisionId]) {
          counselorMap[c.divisionId] = c.facultyName;
        }
      }

      const divisionAssignments = await db
        .select({
          divisionId: facultySubjectAssignments.divisionId,
          facultyName: facultySubjectAssignments.facultyName,
          subjectName: facultySubjectAssignments.subjectName,
          facultyCode: faculty.facultyCode,
          subjectShortCode: subjects.shortCode,
          subjectCode: subjects.code,
          subjectType: subjects.subjectType,
          subjectCredit: subjects.credit,
        })
        .from(facultySubjectAssignments)
        .leftJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .leftJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .where(inArray(facultySubjectAssignments.divisionId, divisionIds));

      for (const a of divisionAssignments) {
        if (!assignmentsMap[a.divisionId]) {
          assignmentsMap[a.divisionId] = [];
        }
        assignmentsMap[a.divisionId].push({
          subjectName: a.subjectName,
          facultyName: a.facultyName,
          subjectShortCode: a.subjectShortCode || a.subjectName.substring(0, 3).toUpperCase(),
          facultyCode: a.facultyCode || a.facultyName.split(' ').map(n => n[0]).join(''),
          subjectCode: a.subjectCode,
          subjectType: a.subjectType,
          subjectCredit: a.subjectCredit,
        });
      }
    }

    const divisionsWithCounselors = rows.map((r) => ({
      ...r,
      counselorName: counselorMap[r.id] || null,
      assignments: assignmentsMap[r.id] || [],
    }));

    const payloadData = {
      divisions: divisionsWithCounselors,
      pagination: { page, limit, total, totalPages },
    };

    try {
      await redis.set(cacheKey, payloadData, { ex: 120 });
    } catch (redisError) {
      console.warn("[Redis SET Error] Failed to cache data:", redisError);
    }

    return ok(payloadData, "db");
  } catch (error) {
    console.error("[GET /api/admin/divisions] Error:", error);
    return err("Internal server error", 500);
  }
}

// ─── POST /api/admin/divisions — Create a new division ────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

    const body = await req.json();
    const { batchYear, semesterNo, specialization } = body;

    // ── Input validation ──────────────────────────────────────────────
    const errors: Record<string, string> = {};

    if (!batchYear || typeof batchYear !== "number" || batchYear < 2020 || batchYear > 2099) {
      errors.batchYear = "Batch year must be between 2020 and 2099";
    }

    if (!semesterNo || typeof semesterNo !== "number" || semesterNo < 1 || semesterNo > 6) {
      errors.semesterNo = "Semester must be between 1 and 6";
    }

    const validSpecializations = ["AI", "DS", "REGULAR"];
    if (!specialization || !validSpecializations.includes(specialization)) {
      errors.specialization = "Specialization must be AI, DS, or REGULAR";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation failed", errors },
        { status: 400 }
      );
    }

    // ── Fetch course info (do not hardcode) ───────────────────────────
    const [course] = await db
      .select({ id: courses.id, code: courses.code, name: courses.name })
      .from(courses)
      .limit(1);

    if (!course) {
      return err("No course configured in the system. Please create a course first.", 400);
    }

    // ── All creation logic wrapped in a single transaction ────────────
    // Prevents orphaned semesters/academic years if division insert fails.
    const semesterName = `Sem ${semesterNo} (${batchYear})`;
    const academicYearName = `${batchYear}-${String(batchYear + 1).slice(-2)}`;

    const created = await db.transaction(async (tx) => {
      // Step 1: Resolve or create academic year
      let academicYearId: number;

      const [existingAcademicYear] = await tx
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(eq(academicYears.name, academicYearName))
        .limit(1);

      if (existingAcademicYear) {
        academicYearId = existingAcademicYear.id;
      } else {
        const [newAcademicYear] = await tx
          .insert(academicYears)
          .values({
            name: academicYearName,
            startYear: batchYear,
            endYear: batchYear + 1,
            isCurrent: true,
          })
          .returning({ id: academicYears.id });
        academicYearId = newAcademicYear.id;
      }

      // Step 2: Resolve or create semester
      let semesterId: number;

      const [existingSemester] = await tx
        .select({ id: semesters.id })
        .from(semesters)
        .where(eq(semesters.name, semesterName))
        .limit(1);

      if (existingSemester) {
        semesterId = existingSemester.id;

        await tx
          .update(semesters)
          .set({ academicYearId })
          .where(eq(semesters.id, semesterId));
      } else {
        const startDate = new Date(batchYear, (semesterNo - 1) * 2, 1)
          .toISOString()
          .split("T")[0];
        const endDate = new Date(batchYear, (semesterNo - 1) * 2 + 6, 0)
          .toISOString()
          .split("T")[0];

        const [newSemester] = await tx
          .insert(semesters)
          .values({
            name: semesterName,
            startDate,
            endDate,
            isActive: true,
            academicYearId,
          })
          .returning({ id: semesters.id });

        semesterId = newSemester.id;
      }

      // Step 3: Auto-assign next division number (global per batch year)
      const [maxResult] = await tx
        .select({ maxDivNo: max(divisions.divisionNo) })
        .from(divisions)
        .where(eq(divisions.batchYear, batchYear));

      const nextDivNo = (maxResult?.maxDivNo ?? 0) + 1;

      // Step 4: Generate permanent division name
      const yy = String(batchYear).slice(-2);
      const specCode = SPECIALIZATION_CODES[specialization] || specialization;
      const displayName = `${yy}${course.code}${specCode}DIV${nextDivNo}`;

      // Step 5: Create division
      const [division] = await tx
        .insert(divisions)
        .values({
          semesterId,
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          specialization,
          batchYear,
          semesterNo,
          divisionNo: nextDivNo,
          displayName,
        })
        .returning({
          id: divisions.id,
          displayName: divisions.displayName,
          specialization: divisions.specialization,
          batchYear: divisions.batchYear,
          semesterNo: divisions.semesterNo,
          divisionNo: divisions.divisionNo,
          courseCode: divisions.courseCode,
          maxCapacity: divisions.maxCapacity,
          createdAt: divisions.createdAt,
        });

      return division;
    });

    // Invalidate cache (outside transaction — non-critical)
    try {
      const keys = await redis.keys("divisions:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (redisError) {
      console.warn("[Redis DEL Error] Failed to invalidate cache:", redisError);
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/divisions] Error:", error);
    return err("Internal server error", 500);
  }
}
