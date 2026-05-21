import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { faculty, facultyRoles, roles, students } from "@/app/lib/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logEvent } from "@/app/lib/logger";
import { signToken, JWTPayload } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    
    const body = await request.json();
    const identifier = String(body.identifier ?? body.email ?? "").trim();
    const password = String(body.password ?? "");
    const ip =
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = request.headers.get("user-agent") || null;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Credential and password are required" },
        { status: 400 }
      );
    }

    // 1) Try faculty login (email)
    const facultyUsers = await db
      .select({
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        passwordHash: faculty.passwordHash,
        mustChangePwd: faculty.mustChangePwd,
        isActive: faculty.isActive,
        facultyCode: faculty.facultyCode,
      })
      .from(faculty)
      .where(eq(faculty.email, identifier))
      .limit(1);

    if (facultyUsers.length > 0) {
      const user = facultyUsers[0];

      // 2. Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        logEvent({
  type: "LOGIN_FAILED",
  userId: String(user.id),
  role: "faculty",
  ip,
  ua,
});
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { success: false, error: "Account is disabled" },
          { status: 403 }
        );
      }

      // 3. Fetch user roles via junction table
      const userRolesRaw = await db
        .select({ name: roles.name })
        .from(facultyRoles)
        .innerJoin(roles, eq(facultyRoles.roleId, roles.id))
        .where(eq(facultyRoles.facultyId, user.id));

      const userRolesList = userRolesRaw.map((r) => r.name);

      // 3.5 Check if they are a counselor for any division's current semester
      const { counselorDivisionAssignments, divisions: divisionsTable, academicYears: academicYearsTable } = await import("@/app/lib/schema");
      const { and } = await import("drizzle-orm");

      const activeAssignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .innerJoin(divisionsTable, and(
          eq(counselorDivisionAssignments.divisionId, divisionsTable.id),
          eq(counselorDivisionAssignments.semesterId, divisionsTable.semesterId)
        ))
        .where(eq(counselorDivisionAssignments.facultyId, user.id));

      const counselorDivisionIds = activeAssignments.map((a) => a.divisionId);

      if (counselorDivisionIds.length > 0 && !userRolesList.includes("counselor")) {
        userRolesList.push("counselor");
      }

      // Fetch current active academic year for faculty
      const activeYear = await db
        .select({ id: academicYearsTable.id })
        .from(academicYearsTable)
        .where(eq(academicYearsTable.isCurrent, true))
        .limit(1);
      const academicYearId = activeYear[0]?.id;

      // 4. Generate JWT
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        roles: userRolesList,
        facultyCode: user.facultyCode,
        counselorDivisionIds: counselorDivisionIds.length > 0 ? counselorDivisionIds : undefined,
        academicYearId,
      };

      const token = await signToken(payload);
      logEvent({
  type: "LOGIN_SUCCESS",
  userId: String(user.id),
  role: "faculty",
  ip,
  ua,
  ts: Date.now(),
});
      // 5. Construct response per AGENTS.md
      const response = NextResponse.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: userRolesList,
          mustChangePwd: user.mustChangePwd,
        },
      });

      // 6. Set HttpOnly Cookie (7 days)
      response.cookies.set({
        name: "auth_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    // 2) Student login (studentId primary; email fallback)
    const studentUsers = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        email: students.email,
        studentId: students.studentId,
        passwordHash: students.passwordHash,
        profilePhoto: students.profilePhoto,
      })
      .from(students)
      .where(or(eq(students.studentId, identifier), eq(students.email, identifier)))
      .limit(1);

    if (studentUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const student = studentUsers[0];
    if (!student.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Password is not set. Use setup link first." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, student.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Fetch student's division, semester, and academic year IDs
    const { divisions: divisionsTable, semesters: semestersTable, academicYears: academicYearsTable } = await import("@/app/lib/schema");

    const studentInfo = await db
      .select({
        divisionId: students.currentDivisionId,
        semesterId: divisionsTable.semesterId,
        academicYearId: semestersTable.academicYearId,
      })
      .from(students)
      .leftJoin(divisionsTable, eq(students.currentDivisionId, divisionsTable.id))
      .leftJoin(semestersTable, eq(divisionsTable.semesterId, semestersTable.id))
      .where(eq(students.id, student.id))
      .limit(1);

    const divisionId = studentInfo[0]?.divisionId ?? undefined;
    const semesterId = studentInfo[0]?.semesterId ?? undefined;
    let academicYearId = studentInfo[0]?.academicYearId ?? undefined;

    if (!academicYearId) {
      // Fall back to the current active academic year
      const activeYear = await db
        .select({ id: academicYearsTable.id })
        .from(academicYearsTable)
        .where(eq(academicYearsTable.isCurrent, true))
        .limit(1);
      academicYearId = activeYear[0]?.id;
    }

    const payload: JWTPayload = {
      userId: student.id,
      email: student.email,
      roles: ["student"],
      studentId: student.studentId ?? undefined,
      divisionId: divisionId || undefined,
      semesterId: semesterId || undefined,
      academicYearId: academicYearId || undefined,
    };

    const token = await signToken(payload);

    const response = NextResponse.json({
      success: true,
      data: {
        id: student.id,
        name: student.fullName,
        email: student.email,
        roles: ["student"],
        studentId: student.studentId,
        profilePhoto: student.profilePhoto
          ? `/api/student/profile-photo?key=${encodeURIComponent(student.profilePhoto)}`
          : undefined,
      },
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    // AGENTS.md: Never return raw errors to the client
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
