import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  circulars,
  circularRecipients,
  students,
  faculty,
  facultySubjectAssignments,
} from "@/app/lib/schema";
import { desc, eq, and, or, inArray, count, sql } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown, pagination?: unknown) {
  return NextResponse.json({ success: true, data, pagination });
}

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getCallerPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── GET /api/circulars — Server-authoritative visibility ─────────────────────
//
// Visibility rules (evaluated IN DATABASE — no frontend filtering):
//
//  Role        | Sees
//  ------------|----------------------------------------------------------
//  student     | ALL + YEAR(matching) + DIVISION(their division)
//  faculty /   | ALL + FACULTY + DIVISION(divisions they teach in)
//  counselor / |   + their own circulars regardless of type
//  hod         |
//
// targetType values:
//   "ALL"      — every authenticated user
//   "FACULTY"  — only faculty/counselor/hod
//   "YEAR"     — students in targetYear
//   "DIVISION" — students in divisions listed in circular_recipients
//
export async function GET(req: NextRequest) {
  try {
    const payload = await getCallerPayload();
    if (!payload) return err("Unauthorized", 401);

    const { userId, roles: jwtRoles } = payload;
    const roles = Array.isArray(jwtRoles) ? jwtRoles : [];

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const isStudent = roles.includes("student");
    const isFaculty =
      roles.includes("faculty") ||
      roles.includes("counselor") ||
      roles.includes("hod");

    // ── Build the WHERE condition based on role ────────────────────────────────

    if (isStudent) {
      // Fetch student profile
      const [studentData] = await db
        .select({
          currentSemesterNo: students.currentSemesterNo,
          currentDivisionId: students.currentDivisionId,
        })
        .from(students)
        .where(eq(students.id, userId))
        .limit(1);

      // Determine which divisionIds this student belongs to for DIVISION circulars
      const studentDivId = studentData?.currentDivisionId ?? null;
      const studentYear = studentData?.currentSemesterNo
        ? Math.ceil(studentData.currentSemesterNo / 2)
        : null;

      // Get circular IDs for divisions the student is in
      let divisionCircularIds: number[] = [];
      if (studentDivId) {
        const divRows = await db
          .select({ circularId: circularRecipients.circularId })
          .from(circularRecipients)
          .where(eq(circularRecipients.divisionId, studentDivId));
        divisionCircularIds = divRows.map((r) => r.circularId);
      }

      // Build OR conditions — only include branches that have valid data
      const conditions = [
        eq(circulars.targetType, "ALL"),
        ...(studentYear !== null
          ? [
              and(
                eq(circulars.targetType, "YEAR"),
                eq(circulars.targetYear, studentYear)
              ),
            ]
          : []),
        ...(divisionCircularIds.length > 0
          ? [
              and(
                eq(circulars.targetType, "DIVISION"),
                inArray(circulars.id, divisionCircularIds)
              ),
            ]
          : []),
      ];

      const whereClause = or(...conditions);

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(circulars)
          .where(whereClause)
          .orderBy(desc(circulars.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count(circulars.id) })
          .from(circulars)
          .where(whereClause),
      ]);

      return ok(await enrichWithDivisions(rows), {
        total: Number(total),
        limit,
        offset,
      });
    }

    if (isFaculty) {
      // Faculty/counselor/HOD see:
      // 1. ALL circulars
      // 2. FACULTY circulars
      // 3. DIVISION circulars for divisions they teach (via facultySubjectAssignments)
      // 4. Their own circulars regardless of type (so they can always see what they published)

      // Get divisions this faculty member teaches
      const assignmentRows = await db
        .select({ divisionId: facultySubjectAssignments.divisionId })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.facultyId, userId));

      const facultyDivisionIds = [
        ...new Set(assignmentRows.map((r) => r.divisionId)),
      ];

      let divisionCircularIds: number[] = [];
      if (facultyDivisionIds.length > 0) {
        const divRows = await db
          .select({ circularId: circularRecipients.circularId })
          .from(circularRecipients)
          .where(inArray(circularRecipients.divisionId, facultyDivisionIds));
        divisionCircularIds = [...new Set(divRows.map((r) => r.circularId))];
      }

      const conditions = [
        eq(circulars.targetType, "ALL"),
        eq(circulars.targetType, "FACULTY"),
        eq(circulars.facultyId, userId), // Own circulars always visible
        ...(divisionCircularIds.length > 0
          ? [
              and(
                eq(circulars.targetType, "DIVISION"),
                inArray(circulars.id, divisionCircularIds)
              ),
            ]
          : []),
      ];

      const whereClause = or(...conditions);

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(circulars)
          .where(whereClause)
          .orderBy(desc(circulars.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count(circulars.id) })
          .from(circulars)
          .where(whereClause),
      ]);

      return ok(await enrichWithDivisions(rows), {
        total: Number(total),
        limit,
        offset,
      });
    }

    return err("Forbidden: no recognized role", 403);
  } catch (error) {
    console.error("[GET /api/circulars]", error);
    return err("Failed to fetch circulars", 500);
  }
}

// ─── Attach division names for DIVISION-type circulars ───────────────────────
async function enrichWithDivisions(rows: typeof circulars.$inferSelect[]) {
  const divisionCircularIds = rows
    .filter((r) => r.targetType === "DIVISION")
    .map((r) => r.id);

  if (divisionCircularIds.length === 0) return rows;

  const recipientRows = await db
    .select({
      circularId: circularRecipients.circularId,
      divisionId: circularRecipients.divisionId,
    })
    .from(circularRecipients)
    .where(inArray(circularRecipients.circularId, divisionCircularIds));

  const map: Record<number, number[]> = {};
  for (const r of recipientRows) {
    if (!map[r.circularId]) map[r.circularId] = [];
    map[r.circularId].push(r.divisionId);
  }

  return rows.map((c) => ({
    ...c,
    targetDivisionIds: map[c.id] ?? [],
  }));
}
