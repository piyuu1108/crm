import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  faculty,
  students,
  divisions,
  facultySubjectAssignments,
  counselorDivisionAssignments,
  studentRequests,
  timetableEntries,
  attendanceAnalyticsSummary,
  subjects,
  administrators,
  timetableSlots,
  facultyRequestProxies,
} from "@/app/lib/schema";
import { eq, and, or, count, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { remember, cacheTags, TTL } from "@/app/lib/cache";
import { RequestProfiler } from "@/app/lib/profiler";

const ROLE_PRIORITY = ["principal", "vice_principal", "hod", "counselor", "faculty", "student"] as const;
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
    const auth = await getAuthContext(req);
    if (!auth) {
      profiler.finish();
      return err("Unauthorized", 401);
    }

    const { userId, roles: rolesArray, activeRole, isRoleForbidden, forbiddenRole } = auth;

    if (isRoleForbidden) {
      profiler.finish();
      return err(`Forbidden: role '${forbiddenRole}' is not assigned to this user`, 403);
    }

    // ── 4. Cache lookup using Adapter Pattern ───────────────────────────────
    const cacheKey = cacheTags.dashboard.user(userId);
    const tags = activeRole === "student" && auth.divisionId
      ? [cacheTags.dashboard.division(auth.divisionId)]
      : [];

    let isDbFetch = false;

    try {
      const payloadData = await remember(
        cacheKey,
        TTL.DASHBOARD,
        async () => {
          isDbFetch = true;
          console.log(`[Dashboard Cache] MISS for key: ${cacheKey}. Fetching from DB...`);
          const [userInfo, dashboard] = await Promise.all([
            profiler.measureAsyncWait(
              "db:resolveUserInfo",
              "db",
              () => resolveUserInfo(userId, activeRole, rolesArray)
            ),
            profiler.measureAsyncWait(
              `db:buildDashboard:${activeRole}`,
              "db",
              () => buildDashboard(activeRole as Role, userId, auth)
            ),
          ]);

          if (!userInfo) {
            throw new Error("User record not found");
          }

          return {
            user: {
              ...userInfo,
              roles: rolesArray,
              activeRole,
            },
            dashboard,
          };
        },
        tags
      );

      profiler.finish();
      return ok(payloadData, isDbFetch ? "db" : "cache");
    } catch (e: any) {
      if (e.message === "User record not found") {
        profiler.finish();
        return err("User record not found", 404);
      }
      throw e;
    }
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
  if (activeRole === "principal" || activeRole === "vice_principal") {
    const rows = await db
      .select({
        id: administrators.id,
        name: administrators.name,
        email: administrators.email,
        adminCode: administrators.adminCode,
      })
      .from(administrators)
      .where(eq(administrators.id, userId))
      .limit(1);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      facultyCode: rows[0].adminCode,
    };
  }

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
async function buildDashboard(role: Role, userId: number, auth: AuthContext) {
  switch (role) {
    case "principal":
    case "vice_principal":
      return buildHodDashboard(auth.activeCourseId ?? "all");
    case "student":
      return buildStudentDashboard(userId, auth);
    case "faculty":
      return buildFacultyDashboard(userId);
    case "counselor":
      return buildCounselorDashboard(userId, auth);
    case "hod":
      return buildHodDashboard(auth.courseId ?? 0);
    default:
      return {};
  }
}

// ── Student ──────────────────────────────────────────────────────────────────
async function buildStudentDashboard(studentId: number, auth: AuthContext) {
  const profileRows = await db
    .select({
      studentId: students.studentId,
      divisionName: students.currentDivisionName,
      currentSemesterNo: students.currentSemesterNo,
      status: students.status,
      profileStatus: students.profileStatus,
      profileStep: students.profileStep,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  const profile = profileRows[0] ?? null;

  const divisionId = auth.divisionId ?? null;
  const semesterId = auth.semesterId ?? null;

  // Query summary statistics from our read-optimized cache
  const [summary] = divisionId && semesterId
    ? await db
        .select({
          presentCount: attendanceAnalyticsSummary.presentCount,
          totalLectures: attendanceAnalyticsSummary.totalLectures,
          attendancePercentage: attendanceAnalyticsSummary.attendancePercentage,
        })
        .from(attendanceAnalyticsSummary)
        .where(
          and(
            eq(attendanceAnalyticsSummary.studentId, studentId),
            eq(attendanceAnalyticsSummary.divisionId, divisionId),
            eq(attendanceAnalyticsSummary.semesterId, semesterId)
          )
        )
        .limit(1)
    : [null];

  const presentCount = summary?.presentCount ?? 0;
  const totalSessions = summary?.totalLectures ?? 0;
  const percentage = summary ? Math.round(Number(summary.attendancePercentage)) : 0;

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

  const todayTimetable = await getTodayTimetableForDivision(divisionId, semesterId);

  const recentRequests = await db
    .select({
      id: studentRequests.id,
      requestType: studentRequests.requestType,
      subject: studentRequests.subject,
      status: studentRequests.status,
      studentName: students.fullName,
      divisionName: sql<string>`coalesce(${students.currentDivisionName}, 'N/A')`,
      createdAt: sql<string>`${studentRequests.createdAt}::text`,
    })
    .from(studentRequests)
    .innerJoin(students, eq(studentRequests.studentId, students.id))
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
        studentName: students.fullName,
        divisionName: sql<string>`coalesce(${students.currentDivisionName}, 'N/A')`,
        createdAt: sql<string>`${studentRequests.createdAt}::text`,
      })
      .from(studentRequests)
      .innerJoin(students, eq(studentRequests.studentId, students.id))
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
  
  // 1. Get today's regular schedule
  const todayTimetable = await getTodayTimetableForAssignments(assignmentIds);

  // 2. Get today's date formatted as YYYY-MM-DD in local time
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  const todayDateStr = localDate.toISOString().split("T")[0];
  const today = getTodayDayOfWeek();

  // 3. Get proxies for this faculty today (either outgoing or incoming)
  const originalFacultyAlias = alias(faculty, "orig_fac");
  const proxyFacultyAlias = alias(faculty, "prox_fac");

  const todayProxies = await db
    .select({
      id: facultyRequestProxies.id,
      date: facultyRequestProxies.date,
      slotId: facultyRequestProxies.slotId,
      originalFacultyId: facultyRequestProxies.originalFacultyId,
      originalFacultyName: originalFacultyAlias.name,
      proxyFacultyId: facultyRequestProxies.proxyFacultyId,
      proxyFacultyName: proxyFacultyAlias.name,
      divisionId: facultyRequestProxies.divisionId,
      divisionName: divisions.displayName,
      subjectId: facultyRequestProxies.subjectId,
      subjectName: subjects.name,
      status: facultyRequestProxies.status,
      startTime: timetableSlots.startTime,
      endTime: timetableSlots.endTime,
    })
    .from(facultyRequestProxies)
    .innerJoin(originalFacultyAlias, eq(facultyRequestProxies.originalFacultyId, originalFacultyAlias.id))
    .innerJoin(proxyFacultyAlias, eq(facultyRequestProxies.proxyFacultyId, proxyFacultyAlias.id))
    .innerJoin(divisions, eq(facultyRequestProxies.divisionId, divisions.id))
    .innerJoin(subjects, eq(facultyRequestProxies.subjectId, subjects.id))
    .innerJoin(timetableSlots, eq(facultyRequestProxies.slotId, timetableSlots.id))
    .where(
      and(
        eq(facultyRequestProxies.date, todayDateStr),
        or(
          eq(facultyRequestProxies.originalFacultyId, facultyId),
          eq(facultyRequestProxies.proxyFacultyId, facultyId)
        )
      )
    );

  // 4. Merge regular schedule with proxies
  const finalSchedule = [];
  const outgoingProxiesMap = new Map();
  const incomingProxies = [];

  for (const proxy of todayProxies) {
    if (proxy.originalFacultyId === facultyId) {
      outgoingProxiesMap.set(proxy.slotId, proxy);
    } else if (proxy.proxyFacultyId === facultyId) {
      incomingProxies.push(proxy);
    }
  }

  // Process regular timetable entries
  for (const entry of todayTimetable) {
    const matchingProxy = entry.slotId ? outgoingProxiesMap.get(entry.slotId) : null;
    if (matchingProxy) {
      finalSchedule.push({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        subjectName: entry.subjectName,
        facultyName: entry.facultyName,
        divisionName: entry.divisionName,
        isProxiedOut: true,
        proxyFacultyName: matchingProxy.proxyFacultyName,
        proxyStatus: matchingProxy.status,
      });
    } else {
      finalSchedule.push({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        subjectName: entry.subjectName,
        facultyName: entry.facultyName,
        divisionName: entry.divisionName,
        isProxiedOut: false,
      });
    }
  }

  // Add incoming proxies
  for (const proxy of incomingProxies) {
    finalSchedule.push({
      id: 100000 + proxy.id,
      dayOfWeek: today,
      startTime: proxy.startTime,
      endTime: proxy.endTime,
      subjectName: proxy.subjectName,
      facultyName: proxy.originalFacultyName,
      divisionName: proxy.divisionName,
      isProxy: true,
      originalFacultyName: proxy.originalFacultyName,
      proxyStatus: proxy.status,
    });
  }

  // Sort schedule by startTime
  finalSchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    assignedSubjectsCount: assignmentsRows.length,
    assignedDivisionsCount: uniqueDivisions.size,
    pendingRequestsCount: pendingRows.length,
    todayTimetable: finalSchedule,
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

async function buildCounselorDashboard(facultyId: number, auth: AuthContext) {
  const divisionIds = auth.counselorDivisionIds ?? [];

  const assignedDivisionRows = divisionIds.length > 0
    ? await db
        .select({
          id: divisions.id,
          divisionName: divisions.displayName,
        })
        .from(divisions)
        .where(
          sql`${divisions.id} IN (${sql.join(
            divisionIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
    : [];

  const pendingRows =
    divisionIds.length > 0
      ? await db
          .select({
            id: studentRequests.id,
            requestType: studentRequests.requestType,
            subject: studentRequests.subject,
            status: studentRequests.status,
            studentName: students.fullName,
            divisionName: sql<string>`coalesce(${students.currentDivisionName}, 'N/A')`,
            createdAt: sql<string>`${studentRequests.createdAt}::text`,
          })
          .from(studentRequests)
          .innerJoin(students, eq(studentRequests.studentId, students.id))
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

async function buildHodDashboard(courseId: number | "all") {
  const isGlobal = courseId === "all";

  const studentConditions = [];
  const approvedConditions = [eq(students.status, "approved")];
  const facultyConditions = [eq(faculty.isActive, true)];

  if (!isGlobal) {
    studentConditions.push(eq(students.courseId, courseId));
    approvedConditions.push(eq(students.courseId, courseId));
    facultyConditions.push(eq(faculty.courseId, courseId));
  }

  const [totalStudentsRow, approvedStudentsRow, totalFacultyRow, pendingRows] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(students)
        .where(studentConditions.length > 0 ? and(...studentConditions) : undefined),
      db
        .select({ count: count() })
        .from(students)
        .where(and(...approvedConditions)),
      db
        .select({ count: count() })
        .from(faculty)
        .where(and(...facultyConditions)),
      isGlobal
        ? db
            .select({
              id: studentRequests.id,
              requestType: studentRequests.requestType,
              subject: studentRequests.subject,
              status: studentRequests.status,
              studentName: students.fullName,
              divisionName: sql<string>`coalesce(${students.currentDivisionName}, 'N/A')`,
              createdAt: sql<string>`${studentRequests.createdAt}::text`,
            })
            .from(studentRequests)
            .innerJoin(students, eq(studentRequests.studentId, students.id))
            .where(eq(studentRequests.status, "pending"))
            .orderBy(sql`${studentRequests.createdAt} DESC`)
            .limit(10)
        : db
            .select({
              id: studentRequests.id,
              requestType: studentRequests.requestType,
              subject: studentRequests.subject,
              status: studentRequests.status,
              studentName: students.fullName,
              divisionName: sql<string>`coalesce(${students.currentDivisionName}, 'N/A')`,
              createdAt: sql<string>`${studentRequests.createdAt}::text`,
            })
            .from(studentRequests)
            .innerJoin(students, eq(studentRequests.studentId, students.id))
            .where(and(eq(studentRequests.status, "pending"), eq(students.courseId, courseId)))
            .orderBy(sql`${studentRequests.createdAt} DESC`)
            .limit(10),
    ]);

  const totalStudents = Number(totalStudentsRow[0]?.count ?? 0);
  const approvedStudents = Number(approvedStudentsRow[0]?.count ?? 0);
  const unapprovedStudents = totalStudents - approvedStudents;

  return {
    totalStudents,
    activeStudents: totalStudents, // Since college pre-creates all accounts, they are all active
    approvedStudents,
    unapprovedStudents,
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
      slotId: timetableEntries.slotId,
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