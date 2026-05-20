import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  circulars,
  circularRecipients,
  students,
  faculty,
  facultySubjectAssignments,
} from "@/app/lib/schema";
import { desc, eq, and, or, inArray, count } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown, pagination?: unknown) {
  return NextResponse.json({ success: true, data, pagination });
}

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getCallerPayload(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return null;
  return payload;
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getCallerPayload(req);
    if (!payload) return err("Unauthorized", 401);

    const { userId, roles: jwtRoles } = payload;
    const roles = Array.isArray(jwtRoles) ? jwtRoles : [];

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const isHod     = roles.includes("hod");
    const isFaculty = roles.includes("faculty") || roles.includes("counselor") || isHod;
    const isStudent = roles.includes("student") && !isFaculty;

    console.log(`[GET /api/circulars] userId=${userId} roles=${JSON.stringify(roles)} isHod=${isHod} isFaculty=${isFaculty} isStudent=${isStudent}`);

    // ── STUDENT ────────────────────────────────────────────────────────────────
    if (isStudent) {
      const [studentData] = await db
        .select({
          currentSemesterNo: students.currentSemesterNo,
          currentDivisionId: students.currentDivisionId,
        })
        .from(students)
        .where(eq(students.id, userId))
        .limit(1);

      const studentDivId  = studentData?.currentDivisionId ?? null;
      const studentYear   = studentData?.currentSemesterNo
        ? Math.ceil(studentData.currentSemesterNo / 2)
        : null;

      let divisionCircularIds: number[] = [];
      if (studentDivId) {
        const divRows = await db
          .select({ circularId: circularRecipients.circularId })
          .from(circularRecipients)
          .where(eq(circularRecipients.divisionId, studentDivId));
        divisionCircularIds = divRows.map((r) => r.circularId);
      }

      const conditions = [
        eq(circulars.targetType, "ALL"),
        ...(studentYear !== null
          ? [and(eq(circulars.targetType, "YEAR"), eq(circulars.targetYear, studentYear))]
          : []),
        ...(divisionCircularIds.length > 0
          ? [and(eq(circulars.targetType, "DIVISION"), inArray(circulars.id, divisionCircularIds))]
          : []),
      ];

      const whereClause = or(...conditions);

      const [rows, [{ total }]] = await Promise.all([
        db.select().from(circulars).where(whereClause).orderBy(desc(circulars.createdAt)).limit(limit).offset(offset),
        db.select({ total: count(circulars.id) }).from(circulars).where(whereClause),
      ]);

      console.log(`[GET /api/circulars] STUDENT year=${studentYear} divId=${studentDivId} → ${total} results`);
      return ok(await enrichWithDivisions(rows), { total: Number(total), limit, offset });
    }

    // ── HOD — sees everything, no filter ──────────────────────────────────────
    if (isHod) {
      const [rows, [{ total }]] = await Promise.all([
        db.select().from(circulars).orderBy(desc(circulars.createdAt)).limit(limit).offset(offset),
        db.select({ total: count(circulars.id) }).from(circulars),
      ]);

      console.log(`[GET /api/circulars] HOD userId=${userId} → ${total} total circulars`);
      return ok(await enrichWithDivisions(rows), { total: Number(total), limit, offset });
    }

    // ── FACULTY / COUNSELOR ────────────────────────────────────────────────────
    if (isFaculty) {
      // Divisions this faculty teaches in (for DIVISION-targeted circulars)
      const assignmentRows = await db
        .select({ divisionId: facultySubjectAssignments.divisionId })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.facultyId, userId));

      const facultyDivisionIds = [...new Set(assignmentRows.map((r) => r.divisionId))];

      let divisionCircularIds: number[] = [];
      if (facultyDivisionIds.length > 0) {
        const divRows = await db
          .select({ circularId: circularRecipients.circularId })
          .from(circularRecipients)
          .where(inArray(circularRecipients.divisionId, facultyDivisionIds));
        divisionCircularIds = [...new Set(divRows.map((r) => r.circularId))];
      }

      // Faculty see:
      // 1. ALL circulars
      // 2. FACULTY circulars
      // 3. Any YEAR circular (faculty should see year-level announcements)
      // 4. Their OWN circulars regardless of type (most important — they created them)
      // 5. DIVISION circulars for divisions they teach
      const whereClause = or(
        eq(circulars.targetType, "ALL"),
        eq(circulars.targetType, "FACULTY"),
        eq(circulars.targetType, "YEAR"),
        eq(circulars.facultyId, userId),           // ← own circulars — always visible
        ...(divisionCircularIds.length > 0
          ? [and(
              eq(circulars.targetType, "DIVISION"),
              inArray(circulars.id, divisionCircularIds)
            )]
          : []),
      );

      const [rows, [{ total }]] = await Promise.all([
        db.select().from(circulars).where(whereClause).orderBy(desc(circulars.createdAt)).limit(limit).offset(offset),
        db.select({ total: count(circulars.id) }).from(circulars).where(whereClause),
      ]);

      console.log(`[GET /api/circulars] FACULTY userId=${userId} divisions=[${facultyDivisionIds.join(",")}] → ${total} results`);
      return ok(await enrichWithDivisions(rows), { total: Number(total), limit, offset });
    }

    return err("Forbidden: no recognized role", 403);
  } catch (error) {
    console.error("[GET /api/circulars]", error);
    return err("Failed to fetch circulars", 500);
  }
}

// ─── Attach division IDs for DIVISION-type circulars ─────────────────────────
async function enrichWithDivisions(rows: (typeof circulars.$inferSelect)[]) {
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

  return rows.map((c) => ({ ...c, targetDivisionIds: map[c.id] ?? [] }));
}
