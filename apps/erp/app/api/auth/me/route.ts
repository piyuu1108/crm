import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty, students, administrators } from "@/app/lib/schema";
import { eq } from "drizzle-orm";

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code;
  const causeCode = (error as { cause?: { code?: string } })?.cause?.code;
  return code === "42703" || code === "42P01" || causeCode === "42703" || causeCode === "42P01";
}

/**
 * GET /api/auth/me
 *
 * Lightweight endpoint that returns the current user's identity + roles.
 * Used by the auth hydrator to populate the Zustand store on app mount.
 *
 * Unlike /api/dashboard, this does NOT fetch role-specific data — it's
 * designed to be fast (~50ms) so the sidebar/navbar can render immediately.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId, roles: rolesArray, activeRole } = auth;

    if (rolesArray.length === 0) {
      return NextResponse.json(
        { success: false, error: "Forbidden: no roles assigned" },
        { status: 403 }
      );
    }

    // Resolve user info from DB (with fallbacks for mixed role/development users)
    let userInfo: {
      id: number;
      name: string;
      email: string;
      facultyCode?: string;
      profilePhoto?: string;
    } | null = null;

    const targetRole = activeRole || (rolesArray.includes("student") ? "student" : "faculty");

    if (targetRole === "principal" || targetRole === "vice_principal") {
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

      if (rows[0]) {
        userInfo = {
          id: rows[0].id,
          name: rows[0].name,
          email: rows[0].email,
          facultyCode: rows[0].adminCode,
        };
      }
    } else if (targetRole === "student") {
      const rows = await db
        .select({
          id: students.id,
          name: students.fullName,
          email: students.email,
          profilePhoto: students.profilePhoto,
        })
        .from(students)
        .where(eq(students.id, userId))
        .limit(1);

      if (rows[0]) {
        userInfo = {
          id: rows[0].id,
          name: rows[0].name,
          email: rows[0].email,
          profilePhoto: rows[0].profilePhoto
            ? `/api/student/profile-photo?key=${encodeURIComponent(rows[0].profilePhoto)}`
            : undefined,
        };
      } else {
        // Fallback: check faculty table
        const facultyRows = await db
          .select({
            id: faculty.id,
            name: faculty.name,
            email: faculty.email,
            facultyCode: faculty.facultyCode,
            profilePhotoUrl: faculty.profilePhotoUrl,
          })
          .from(faculty)
          .where(eq(faculty.id, userId))
          .limit(1);

        if (facultyRows[0]) {
          userInfo = {
            id: facultyRows[0].id,
            name: facultyRows[0].name,
            email: facultyRows[0].email,
            facultyCode: facultyRows[0].facultyCode,
            profilePhoto: facultyRows[0].profilePhotoUrl
              ? `/api/student/profile-photo?key=${encodeURIComponent(facultyRows[0].profilePhotoUrl)}`
              : undefined,
          };
        }
      }
    } else {
      const rows = await db
        .select({
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          facultyCode: faculty.facultyCode,
          profilePhotoUrl: faculty.profilePhotoUrl,
        })
        .from(faculty)
        .where(eq(faculty.id, userId))
        .limit(1);

      if (rows[0]) {
        userInfo = {
          id: rows[0].id,
          name: rows[0].name,
          email: rows[0].email,
          facultyCode: rows[0].facultyCode,
          profilePhoto: rows[0].profilePhotoUrl
            ? `/api/student/profile-photo?key=${encodeURIComponent(rows[0].profilePhotoUrl)}`
            : undefined,
        };
      } else {
        // Fallback: check students table
        const studentRows = await db
          .select({
            id: students.id,
            name: students.fullName,
            email: students.email,
            profilePhoto: students.profilePhoto,
          })
          .from(students)
          .where(eq(students.id, userId))
          .limit(1);

        if (studentRows[0]) {
          userInfo = {
            id: studentRows[0].id,
            name: studentRows[0].name,
            email: studentRows[0].email,
            profilePhoto: studentRows[0].profilePhoto
              ? `/api/student/profile-photo?key=${encodeURIComponent(studentRows[0].profilePhoto)}`
              : undefined,
          };
        }
      }
    }

    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        roles: rolesArray,
        facultyCode: userInfo.facultyCode ?? undefined,
        profilePhoto: userInfo.profilePhoto ?? undefined,
      },
    });
  } catch (error) {
    console.error("[/api/auth/me] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
