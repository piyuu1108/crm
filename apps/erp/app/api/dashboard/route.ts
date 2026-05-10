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
} from "@/app/lib/schema";
import { eq, and, or, count, sql } from "drizzle-orm";
import { redis } from "@/app/lib/redis";

// ─── Role priority order (used for default selection) ─────────────────────────
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
  try {
    // 1. Read auth_token from httpOnly cookie — never from Authorization header
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return err("Unauthorized", 401);
    }

    // 2. Verify JWT (second verification after Edge middleware — prevents header spoofing)
    const payload = await verifyToken(token);
    if (!payload) {
      return err("Unauthorized: invalid or expired session", 401);
    }

    const { userId, roles: jwtRoles } = payload;
    const rolesArray = Array.isArray(jwtRoles) ? jwtRoles : [];

    if (rolesArray.length === 0) {
      return err("Forbidden: no roles assigned", 403);
    }

    // 3. Determine requested role — never trust blindly; must exist in JWT
    const requestedRole =
      req.headers.get("X-Active-Role") ??
      req.nextUrl.searchParams.get("role") ??
      null;

    let activeRole: string;

    if (requestedRole) {
      if (!rolesArray.includes(requestedRole)) {
        return err(
          `Forbidden: role '${requestedRole}' is not assigned to this user`,
          403
        );
      }
      activeRole = requestedRole;
    } else {
      // Default: pick by priority order
      activeRole =
        ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];
    }

    // 4. Try fetching from Cache (Graceful degradation)
    const cacheKey = `dashboard:user:${userId}:role:${activeRole}`;
    
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`[Dashboard Cache] HIT for key: ${cacheKey}`);
        return ok(cachedData, "cache");
      }
    } catch (redisError) {
      console.warn("[Redis GET Error] Falling back to DB:", redisError);
    }

    console.log(`[Dashboard Cache] MISS for key: ${cacheKey}. Fetching from DB...`);

    // 5. Build user info + role-specific dashboard data
    const [userInfo, dashboard] = await Promise.all([
      resolveUserInfo(userId, activeRole, rolesArray),
      buildDashboard(activeRole as Role, userId),
    ]);

    if (!userInfo) {
      return err("User record not found", 404);
    }

    const payloadData = {
      user: {
        ...userInfo,
        roles: rolesArray,
        activeRole,
      },
      dashboard,
    };

    // Store in cache for 5 minutes (300 seconds) with fail-safe
    try {
      await redis.set(cacheKey, payloadData, { ex: 300 });
    } catch (redisError) {
      console.warn("[Redis SET Error] Failed to cache data:", redisError);
    }

    return ok(payloadData, "db");
  } catch (error) {
    console.error("[/api/dashboard] Unhandled error:", error);
    return err("An unexpected error occurred", 500);
  }
}

// ─── User info resolver ───────────────────────────────────────────────────────
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

  // Faculty (covers faculty, counselor, hod)
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
  // Profile
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

  // Derive semester from student's division
  let semesterId: number | null = null;
  if (profile?.currentDivisionId) {
    const [div] = await db
      .select({ semesterId: divisions.semesterId })
      .from(divisions)
      .where(eq(divisions.id, profile.currentDivisionId))
      .limit(1);
    semesterId = div?.semesterId ?? null;
  }

  // Attendance aggregate (only non-cancelled sessions)
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
          ...(semesterId
            ? [eq(attendanceSessions.semesterId, semesterId)]
            : [])
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
          ...(semesterId
            ? [eq(attendanceSessions.semesterId, semesterId)]
            : [])
        )
      ),
  ]);

  const presentCount = attRows[0]?.count ?? 0;
  const totalSessions = totalRows[0]?.count ?? 0;
  const percentage =
    totalSessions > 0
      ? Math.round((Number(presentCount) / Number(totalSessions)) * 100)
      : 0;

  // Pending requests count
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

  // Today's timetable (from student's division)
  const divisionId = profile?.currentDivisionId ?? null;

  const todayTimetable = await getTodayTimetableForDivision(
    divisionId,
    semesterId
  );

  // Recent requests (last 5)
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
    profile: profile ? {
      studentId: profile.studentId,
      divisionName: profile.divisionName,
      currentSemesterNo: profile.currentSemesterNo,
      status: profile.status,
      profileStatus: profile.profileStatus,
      profileStep: profile.profileStep,
    } : null,
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
  // Get assignments scoped to each division's current semester
  const [assignmentsRows, pendingRows] = await Promise.all([
    db
      .select({
        id: facultySubjectAssignments.id,
        subjectName: facultySubjectAssignments.subjectName,
        subjectType: facultySubjectAssignments.subjectType,
        divisionName: facultySubjectAssignments.divisionName,
        courseCode: facultySubjectAssignments.courseCode,
        divisionId: facultySubjectAssignments.divisionId,
      })
      .from(facultySubjectAssignments)
      .innerJoin(divisions, and(
        eq(facultySubjectAssignments.divisionId, divisions.id),
        eq(facultySubjectAssignments.semesterId, divisions.semesterId)
      ))
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

  // Get today's timetable — from assignments scoped to current division semesters
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
  // Get divisions assigned to this counselor — scoped to each division's current semester
  const assignedDivisionRows = await db
    .select({
      id: counselorDivisionAssignments.divisionId,
      divisionName: counselorDivisionAssignments.divisionName,
    })
    .from(counselorDivisionAssignments)
    .innerJoin(divisions, and(
      eq(counselorDivisionAssignments.divisionId, divisions.id),
      eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
    ))
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

  // Count students in assigned divisions
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
      semesterNo: 0, // not needed for counselor KPI
      courseCode: "",
    })),
    pendingRequestsCount: pendingRows.length,
    totalStudentsCount: Number(totalStudentsRow[0]?.count ?? 0),
    pendingRequests: pendingRows,
  };
}

// ── HOD ──────────────────────────────────────────────────────────────────────
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
      subjectName: timetableEntries.subjectName,
      facultyName: timetableEntries.facultyName,
      divisionName: timetableEntries.divisionName,
    })
    .from(timetableEntries)
    .innerJoin(divisions, eq(divisions.id, timetableEntries.divisionId))
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
      subjectName: timetableEntries.subjectName,
      facultyName: timetableEntries.facultyName,
      divisionName: timetableEntries.divisionName,
    })
    .from(timetableEntries)
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
