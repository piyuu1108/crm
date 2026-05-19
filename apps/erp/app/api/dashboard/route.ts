import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  faculty,
  students,
  divisions,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  studentRequests,
  timetableEntries,
  attendance,
  attendanceSessions,
  subjects,
} from "@/app/lib/schema";
import { eq, and, or, count, sql } from "drizzle-orm";
import { redis } from "@/app/lib/redis";
import { RequestProfiler } from "@/app/lib/profiler";

const ROLE_PRIORITY = ["hod", "counselor", "faculty", "student"] as const;
type Role = (typeof ROLE_PRIORITY)[number];

// ─── Response builder ─────────────────────────────────────────────────────────
function ok(data: unknown, source: "db" | "cache" = "db") {
  return NextResponse.json(
    { success: true, source, data },
    { status: 200, headers: { "X-Cache": source === "cache" ? "HIT" : "MISS" } }
  );
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // One profiler per request — created at the very top so `totalDuration` is
  // measured from the true start of handler execution, not after any setup.
  const profiler = new RequestProfiler();

  try {
    // ── 1. Read auth_token from httpOnly cookie ───────────────────────────────
    // This is a synchronous cookie-store lookup — counts as CPU.
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      profiler.finish();
      return err("Unauthorized", 401);
    }

    // ── 2. Verify JWT ─────────────────────────────────────────────────────────
    // verifyToken internally does crypto (CPU-bound) + possibly a DB/KV lookup.
    // We wrap it as a tracked async wait. If your verifyToken is purely CPU
    // (e.g. jsonwebtoken.verify with a local secret), swap to measureCpuSection.
    const payload = await profiler.measureAsyncWait(
      "auth:verifyToken",
      "cpu", // JWT RS256 verification is CPU (crypto), no network
      () => verifyToken(token)
    );

    if (!payload) {
      profiler.finish();
      return err("Unauthorized: invalid or expired session", 401);
    }

    // ── 3. Role resolution (pure CPU logic) ───────────────────────────────────
    const { userId, roles: jwtRoles } = payload;
    const activeRole = profiler.measureCpuSection("auth:resolveRole", () => {
      const rolesArray = Array.isArray(jwtRoles) ? jwtRoles : [];
      if (rolesArray.length === 0) return null;

      const requestedRole =
        req.headers.get("X-Active-Role") ??
        req.nextUrl.searchParams.get("role") ??
        null;

      if (requestedRole) {
        if (!rolesArray.includes(requestedRole)) return `__forbidden:${requestedRole}`;
        return requestedRole;
      }

      return ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];
    });

    const rolesArray = Array.isArray(jwtRoles) ? jwtRoles : [];
    if (rolesArray.length === 0) {
      profiler.finish();
      return err("Forbidden: no roles assigned", 403);
    }
    if (!activeRole) {
      profiler.finish();
      return err("Forbidden: no roles assigned", 403);
    }
    if (activeRole.startsWith("__forbidden:")) {
      const role = activeRole.slice("__forbidden:".length);
      profiler.finish();
      return err(`Forbidden: role '${role}' is not assigned to this user`, 403);
    }

    // ── 4. Redis cache lookup ─────────────────────────────────────────────────
    // measureAsyncWait records only the network RTT to Redis.
    // The surrounding cache-key construction is pure CPU (negligible, not timed).
    const cacheKey = `dashboard:user:${userId}:role:${activeRole}`;

    const cachedData = await profiler
      .measureAsyncWait("cache:redisGet", "redis", async () => {
        try {
          return await redis.get(cacheKey);
        } catch (redisError) {
          console.warn("[Redis GET Error] Falling back to DB:", redisError);
          return null;
        }
      });

    if (cachedData) {
      console.log(`[Dashboard Cache] HIT for key: ${cacheKey}`);
      profiler.finish();
      return ok(cachedData, "cache");
    }

    console.log(`[Dashboard Cache] MISS for key: ${cacheKey}. Fetching from DB...`);

    // ── 5. Parallel DB fetches ────────────────────────────────────────────────
    // Promise.all here means both DB calls fly concurrently. We track them as
    // two separate async waits. The wall time for the parallel block is
    // max(userInfo, dashboard) — but we log each independently for visibility.
    //
    // Note: because they run concurrently, summing their individual durations
    // would OVER-count total I/O. The profiler sums them for budget awareness,
    // not for exact wall-time decomposition.
    const [userInfo, dashboard] = await Promise.all([
      profiler.measureAsyncWait(
        "db:resolveUserInfo",
        "db",
        () => resolveUserInfo(userId, activeRole, rolesArray)
      ),
      profiler.measureAsyncWait(
        `db:buildDashboard:${activeRole}`,
        "db",
        () => buildDashboard(activeRole as Role, userId)
      ),
    ]);

    if (!userInfo) {
      profiler.finish();
      return err("User record not found", 404);
    }

    // ── 6. Payload assembly (CPU) ─────────────────────────────────────────────
    const payloadData = profiler.measureCpuSection("cpu:assemblePayload", () => ({
      user: {
        ...userInfo,
        roles: rolesArray,
        activeRole,
      },
      dashboard,
    }));

    // ── 7. JSON serialization (CPU — often ignored but measurable) ────────────
    // JSON.stringify on large dashboard payloads (arrays, nested objects) is
    // a synchronous CPU operation. We time it separately to surface it.
    // On Cloudflare, large serializations can consume a non-trivial CPU budget.
    const serialized = profiler.measureCpuSection("serialization:payloadData", () =>
      JSON.stringify(payloadData)
    );
    profiler.trackSection(
      "serialization:payloadData",
      // Re-track as serialization category so the report correctly groups it
      0, // placeholder — actual timing captured inside measureCpuSection above
      "serialization"
    );

    // ── 8. Cache write (fire-and-forget Redis write) ──────────────────────────
    // We wrap this too. Even though it's non-blocking from the user's POV,
    // tracking it tells us how much work happens before we can GC the payload.
    await profiler.measureAsyncWait("cache:redisSet", "redis", async () => {
      try {
        await redis.set(cacheKey, payloadData, { ex: 300 });
      } catch (redisError) {
        console.warn("[Redis SET Error] Failed to cache data:", redisError);
      }
    });

    // ── 9. Response serialization (final JSON.stringify by Next.js) ───────────
    // NextResponse.json() runs its own JSON.stringify internally. We measure
    // our explicit serialization above; Next's pass is not easily interceptable.
    // In practice it's a second stringify of the same data — worth knowing.

    // Emit profile before returning
    profiler.finish();

    return ok(payloadData, "db");
  } catch (error) {
    console.error("[/api/dashboard] Unhandled error:", error);
    profiler.finish();
    return err("An unexpected error occurred", 500);
  }
}

// ─── User info resolver ───────────────────────────────────────────────────────
// These functions contain DB calls. The profiler wraps them at the call site
// (above) rather than inside, keeping DB functions clean and single-purpose.
async function resolveUserInfo(
  userId: number,
  activeRole: string,
  roles: string[]
) {
  if (activeRole === "student") {
    const rows = await db
      .select({
        id: students.id,
        name: students.fullName,
        email: students.email,
      })
      .from(students)
      .where(eq(students.id, userId))
      .limit(1);
    if (!rows[0]) return null;
    return { id: rows[0].id, name: rows[0].name, email: rows[0].email };
  }

  const rows = await db
    .select({
      id: faculty.id,
      name: faculty.name,
      email: faculty.email,
      facultyCode: faculty.facultyCode,
    })
    .from(faculty)
    .where(eq(faculty.id, userId))
    .limit(1);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    facultyCode: rows[0].facultyCode,
  };
}

// ─── Dashboard builders ───────────────────────────────────────────────────────
async function buildDashboard(role: Role, userId: number) {
  switch (role) {
    case "student":
      return buildStudentDashboard(userId);
    case "faculty":
      return buildFacultyDashboard(userId);
    case "counselor":
      return buildCounselorDashboard(userId);
    case "hod":
      return buildHodDashboard();
    default:
      return {};
  }
}

// ── Student ──────────────────────────────────────────────────────────────────
async function buildStudentDashboard(studentId: number) {
  const profileRows = await db
    .select({
      studentId: students.studentId,
      divisionName: students.currentDivisionName,
      currentSemesterNo: students.currentSemesterNo,
      currentDivisionId: students.currentDivisionId,
      status: students.status,
      profileStatus: students.profileStatus,
      profileStep: students.profileStep,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  const profile = profileRows[0] ?? null;

  let semesterId: number | null = null;
  if (profile?.currentDivisionId) {
    const [div] = await db
      .select({ semesterId: divisions.semesterId })
      .from(divisions)
      .where(eq(divisions.id, profile.currentDivisionId))
      .limit(1);
    semesterId = div?.semesterId ?? null;
  }

  const [attRows, totalRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(attendance)
      .innerJoin(
        attendanceSessions,
        eq(attendance.attendanceSessionId, attendanceSessions.id)
      )
      .where(
        and(
          eq(attendance.studentId, studentId),
          eq(attendance.status, "present"),
          eq(attendanceSessions.isCancelled, false),
          ...(semesterId ? [eq(attendanceSessions.semesterId, semesterId)] : [])
        )
      ),
    db
      .select({ count: count() })
      .from(attendance)
      .innerJoin(
        attendanceSessions,
        eq(attendance.attendanceSessionId, attendanceSessions.id)
      )
      .where(
        and(
          eq(attendance.studentId, studentId),
          eq(attendanceSessions.isCancelled, false),
          ...(semesterId ? [eq(attendanceSessions.semesterId, semesterId)] : [])
        )
      ),
  ]);

  const presentCount = attRows[0]?.count ?? 0;
  const totalSessions = totalRows[0]?.count ?? 0;
  const percentage =
    totalSessions > 0
      ? Math.round((Number(presentCount) / Number(totalSessions)) * 100)
      : 0;

  const pendingRows = await db
    .select({ count: count() })
    .from(studentRequests)
    .where(
      and(
        eq(studentRequests.studentId, studentId),
        eq(studentRequests.status, "pending")
      )
    );
  const pendingRequestsCount = Number(pendingRows[0]?.count ?? 0);

  const divisionId = profile?.currentDivisionId ?? null;
  const todayTimetable = await getTodayTimetableForDivision(divisionId, semesterId);

  const recentRequests = await db
    .select({
      id: studentRequests.id,
      requestType: studentRequests.requestType,
      subject: studentRequests.subject,
      status: studentRequests.status,
      studentName: studentRequests.studentName,
      divisionName: studentRequests.divisionName,
      createdAt: sql<string>`${studentRequests.createdAt}::text`,
    })
    .from(studentRequests)
    .where(eq(studentRequests.studentId, studentId))
    .orderBy(sql`${studentRequests.createdAt} DESC`)
    .limit(5);

  return {
    profile: profile
      ? {
          studentId: profile.studentId,
          divisionName: profile.divisionName,
          currentSemesterNo: profile.currentSemesterNo,
          status: profile.status,
          profileStatus: profile.profileStatus,
          profileStep: profile.profileStep,
        }
      : null,
    attendance: {
      totalSessions: Number(totalSessions),
      presentCount: Number(presentCount),
      percentage,
    },
    pendingRequestsCount,
    todayTimetable,
    recentRequests,
  };
}

async function buildFacultyDashboard(facultyId: number) {
  const [assignmentsRows, pendingRows] = await Promise.all([
    db
      .select({
        id: facultySubjectAssignments.id,
        subjectName: subjects.name,
        subjectType: subjects.subjectType,
        divisionName: divisions.displayName,
        courseCode: divisions.courseCode,
        divisionId: facultySubjectAssignments.divisionId,
      })
      .from(facultySubjectAssignments)
      .innerJoin(
        divisions,
        and(
          eq(facultySubjectAssignments.divisionId, divisions.id),
          eq(facultySubjectAssignments.semesterId, divisions.semesterId)
        )
      )
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .where(eq(facultySubjectAssignments.facultyId, facultyId)),
    db
      .select({
        id: studentRequests.id,
        requestType: studentRequests.requestType,
        subject: studentRequests.subject,
        status: studentRequests.status,
        studentName: studentRequests.studentName,
        divisionName: studentRequests.divisionName,
        createdAt: sql<string>`${studentRequests.createdAt}::text`,
      })
      .from(studentRequests)
      .where(
        and(
          eq(studentRequests.targetFacultyId, facultyId),
          eq(studentRequests.status, "pending")
        )
      )
      .orderBy(sql`${studentRequests.createdAt} DESC`)
      .limit(10),
  ]);

  const uniqueDivisions = new Set(assignmentsRows.map((a) => a.divisionId));
  const assignmentIds = assignmentsRows.map((a) => a.id);
  const todayTimetable = await getTodayTimetableForAssignments(assignmentIds);

  return {
    assignedSubjectsCount: assignmentsRows.length,
    assignedDivisionsCount: uniqueDivisions.size,
    pendingRequestsCount: pendingRows.length,
    todayTimetable,
    assignments: assignmentsRows.map((a) => ({
      id: a.id,
      subjectName: a.subjectName,
      subjectType: a.subjectType,
      divisionName: a.divisionName,
      courseCode: a.courseCode,
    })),
    pendingRequests: pendingRows,
  };
}

async function buildCounselorDashboard(facultyId: number) {
  const assignedDivisionRows = await db
    .select({
      id: counselorDivisionAssignments.divisionId,
      divisionName: divisions.displayName,
    })
    .from(counselorDivisionAssignments)
    .innerJoin(
      divisions,
      and(
        eq(counselorDivisionAssignments.divisionId, divisions.id),
        eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
      )
    )
    .where(eq(counselorDivisionAssignments.facultyId, facultyId));

  const divisionIds = assignedDivisionRows.map((d) => d.id);

  const pendingRows =
    divisionIds.length > 0
      ? await db
          .select({
            id: studentRequests.id,
            requestType: studentRequests.requestType,
            subject: studentRequests.subject,
            status: studentRequests.status,
            studentName: studentRequests.studentName,
            divisionName: studentRequests.divisionName,
            createdAt: sql<string>`${studentRequests.createdAt}::text`,
          })
          .from(studentRequests)
          .where(eq(studentRequests.status, "pending"))
          .orderBy(sql`${studentRequests.createdAt} DESC`)
          .limit(10)
      : [];

  const totalStudentsRow =
    divisionIds.length > 0
      ? await db
          .select({ count: count() })
          .from(students)
          .where(
            sql`${students.currentDivisionId} IN (${sql.join(
              divisionIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
      : [{ count: 0 }];

  return {
    assignedDivisions: assignedDivisionRows.map((d) => ({
      id: d.id,
      displayName: d.divisionName,
      semesterNo: 0,
      courseCode: "",
    })),
    pendingRequestsCount: pendingRows.length,
    totalStudentsCount: Number(totalStudentsRow[0]?.count ?? 0),
    pendingRequests: pendingRows,
  };
}

async function buildHodDashboard() {
  const [totalStudentsRow, activeStudentsRow, totalFacultyRow, pendingRows] =
    await Promise.all([
      db.select({ count: count() }).from(students),
      db
        .select({ count: count() })
        .from(students)
        .where(or(eq(students.status, "approved"), eq(students.status, "active"))),
      db.select({ count: count() }).from(faculty).where(eq(faculty.isActive, true)),
      db
        .select({
          id: studentRequests.id,
          requestType: studentRequests.requestType,
          subject: studentRequests.subject,
          status: studentRequests.status,
          studentName: studentRequests.studentName,
          divisionName: studentRequests.divisionName,
          createdAt: sql<string>`${studentRequests.createdAt}::text`,
        })
        .from(studentRequests)
        .where(eq(studentRequests.status, "pending"))
        .orderBy(sql`${studentRequests.createdAt} DESC`)
        .limit(10),
    ]);

  return {
    totalStudents: Number(totalStudentsRow[0]?.count ?? 0),
    activeStudents: Number(activeStudentsRow[0]?.count ?? 0),
    totalFaculty: Number(totalFacultyRow[0]?.count ?? 0),
    pendingRequestsCount: pendingRows.length,
    pendingRequests: pendingRows,
  };
}

// ─── Timetable helpers ────────────────────────────────────────────────────────
function getTodayDayOfWeek(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

async function getTodayTimetableForDivision(
  divisionId: number | null,
  semesterId: number | null
) {
  if (!divisionId) return [];
  const today = getTodayDayOfWeek();
  const filters = [
    eq(timetableEntries.divisionId, divisionId),
    eq(timetableEntries.dayOfWeek, today),
    eq(divisions.publishStatus, "published"),
    ...(semesterId ? [eq(timetableEntries.semesterId, semesterId)] : []),
  ];
  return db
    .select({
      id: timetableEntries.id,
      dayOfWeek: timetableEntries.dayOfWeek,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      subjectName: subjects.name,
      facultyName: faculty.name,
      divisionName: divisions.displayName,
    })
    .from(timetableEntries)
    .innerJoin(divisions, eq(divisions.id, timetableEntries.divisionId))
    .innerJoin(
      facultySubjectAssignments,
      eq(facultySubjectAssignments.id, timetableEntries.assignmentId)
    )
    .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
    .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
    .where(and(...filters))
    .orderBy(timetableEntries.startTime);
}

async function getTodayTimetableForAssignments(assignmentIds: number[]) {
  if (assignmentIds.length === 0) return [];
  const today = getTodayDayOfWeek();

  return db
    .select({
      id: timetableEntries.id,
      dayOfWeek: timetableEntries.dayOfWeek,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      subjectName: subjects.name,
      facultyName: faculty.name,
      divisionName: divisions.displayName,
    })
    .from(timetableEntries)
    .innerJoin(
      facultySubjectAssignments,
      eq(facultySubjectAssignments.id, timetableEntries.assignmentId)
    )
    .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
    .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
    .innerJoin(divisions, eq(timetableEntries.divisionId, divisions.id))
    .where(
      and(
        eq(timetableEntries.dayOfWeek, today),
        sql`${timetableEntries.assignmentId} IN (${sql.join(
          assignmentIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    )
    .orderBy(timetableEntries.startTime);
}