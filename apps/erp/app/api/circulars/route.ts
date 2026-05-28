import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { hasPermission } from "@/app/lib/permissions";
import { db } from "@/app/lib/db";
import {
  circulars,
  circularRecipients,
  divisions,
  facultySubjectAssignments,
} from "@/app/lib/schema";
import { desc, eq, and, or, inArray, count } from "drizzle-orm";
import { remember, cacheTags, TTL } from "@/app/lib/cache";
import { validateQuery } from "@/app/lib/validations/validate";
import { PaginationSchema } from "@/app/lib/validations/schemas/common";


async function getGlobalCirculars() {
  return remember(
    cacheTags.circulars.global(),
    TTL.CIRCULARS,
    async () => {
      const rows = await db
        .select()
        .from(circulars)
        .where(eq(circulars.targetType, "ALL"))
        .orderBy(desc(circulars.createdAt));
      return enrichWithDivisions(rows);
    }
  );
}

async function getYearCirculars(year: number) {
  return remember(
    cacheTags.circulars.year(year),
    TTL.CIRCULARS,
    async () => {
      const rows = await db
        .select()
        .from(circulars)
        .where(and(eq(circulars.targetType, "YEAR"), eq(circulars.targetYear, year)))
        .orderBy(desc(circulars.createdAt));
      return enrichWithDivisions(rows);
    }
  );
}

async function getDivisionCirculars(divisionId: number) {
  return remember(
    cacheTags.circulars.division(divisionId),
    TTL.CIRCULARS,
    async () => {
      const divRows = await db
        .select({ circularId: circularRecipients.circularId })
        .from(circularRecipients)
        .where(eq(circularRecipients.divisionId, divisionId));
      const ids = divRows.map((r) => r.circularId);
      if (ids.length === 0) return [];
      const rows = await db
        .select()
        .from(circulars)
        .where(and(eq(circulars.targetType, "DIVISION"), inArray(circulars.id, ids)))
        .orderBy(desc(circulars.createdAt));
      return enrichWithDivisions(rows);
    }
  );
}

async function getFacultyCirculars() {
  return remember(
    cacheTags.circulars.faculty(),
    TTL.CIRCULARS,
    async () => {
      const rows = await db
        .select()
        .from(circulars)
        .where(eq(circulars.targetType, "FACULTY"))
        .orderBy(desc(circulars.createdAt));
      return enrichWithDivisions(rows);
    }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown, pagination?: unknown) {
  return NextResponse.json({ success: true, data, pagination });
}

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Resolves the student's academic year (1, 2, 3) from their division's semesterNo.
 * semesterNo is the actual semester number (1-6), NOT the database ID.
 * Year = Math.ceil(semesterNo / 2)  →  Sem 1-2 = Year 1, Sem 3-4 = Year 2, Sem 5-6 = Year 3
 */
async function getStudentAcademicYear(divisionId: number): Promise<number | null> {
  const [div] = await db
    .select({ semesterNo: divisions.semesterNo })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);
  if (!div) return null;
  return Math.ceil(div.semesterNo / 2);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "circulars.view");
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole } = auth;

    const { searchParams } = new URL(req.url);
    const parsed = validateQuery(searchParams, PaginationSchema);
    if (!parsed.success) return parsed.error;
    const { limit, offset } = parsed.data;

    // Use activeRole (not roles array) for routing — respects the user's current role switch
    const isStudent = activeRole === "student";
    const isGlobalAdmin = hasPermission(activeRole, "dashboard.view_admin");
    const isHod = activeRole === "hod";
    const isFacultyLike = hasPermission(activeRole, "circulars.create");

    console.log(`[GET /api/circulars] userId=${userId} activeRole=${activeRole} isStudent=${isStudent} isGlobalAdmin=${isGlobalAdmin} isHod=${isHod} isFaculty=${isFacultyLike}`);

    // ── STUDENT ────────────────────────────────────────────────────────────────
    if (isStudent) {
      const studentDivId = auth.divisionId ?? null;

      // Resolve academic year from division's semesterNo (not the semester DB ID)
      const studentYear = studentDivId
        ? await getStudentAcademicYear(studentDivId)
        : null;

      // Parallel fetch cached segments
      const [globalCirculars, yearCirculars, divCirculars] = await Promise.all([
        getGlobalCirculars(),
        studentYear ? getYearCirculars(studentYear) : Promise.resolve([]),
        studentDivId ? getDivisionCirculars(studentDivId) : Promise.resolve([]),
      ]);

      const merged = [...globalCirculars, ...yearCirculars, ...divCirculars];
      // Deduplicate by ID
      const deduped = Array.from(new Map(merged.map((c) => [c.id, c])).values());
      // Sort by createdAt descending
      deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const paginated = deduped.slice(offset, offset + limit);
      const total = deduped.length;

      console.log(`[GET /api/circulars] STUDENT year=${studentYear} divId=${studentDivId} → ${total} results (cached)`);
      return ok(paginated, { total: Number(total), limit, offset });
    }

    // ── GLOBAL ADMIN ───────────────────────────────────────────────────────────
    if (isGlobalAdmin) {
      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(circulars)
          .where(
            or(
              inArray(circulars.targetType, ["ALL", "FACULTY"]),
              eq(circulars.adminId, userId)
            )
          )
          .orderBy(desc(circulars.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count(circulars.id) })
          .from(circulars)
          .where(
            or(
              inArray(circulars.targetType, ["ALL", "FACULTY"]),
              eq(circulars.adminId, userId)
            )
          ),
      ]);

      console.log(`[GET /api/circulars] ADMIN userId=${userId} → ${total} global/own circulars`);
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
    if (isFacultyLike) {
      // Divisions this faculty teaches in
      const assignmentRows = await db
        .select({ divisionId: facultySubjectAssignments.divisionId })
        .from(facultySubjectAssignments)
        .where(eq(facultySubjectAssignments.facultyId, userId));

      const counselorDivIds = auth.counselorDivisionIds ?? [];
      const facultyDivisionIds = [...new Set([...assignmentRows.map((r) => r.divisionId), ...counselorDivIds])];

      // Parallel fetch cached segments
      const [globalCirculars, facultyCirculars, y1, y2, y3, y4, ...divisionCircularsList] = await Promise.all([
        getGlobalCirculars(),
        getFacultyCirculars(),
        getYearCirculars(1),
        getYearCirculars(2),
        getYearCirculars(3),
        getYearCirculars(4),
        ...facultyDivisionIds.map((divId) => getDivisionCirculars(divId)),
      ]);

      // Database-backed fetch for own circulars
      const ownCirculars = await db
        .select()
        .from(circulars)
        .where(eq(circulars.facultyId, userId))
        .orderBy(desc(circulars.createdAt));
      const ownEnriched = await enrichWithDivisions(ownCirculars);

      // Merge everything
      const merged = [
        ...globalCirculars,
        ...facultyCirculars,
        ...y1,
        ...y2,
        ...y3,
        ...y4,
        ...divisionCircularsList.flat(),
        ...ownEnriched,
      ];

      // Deduplicate by ID
      const deduped = Array.from(new Map(merged.map((c) => [c.id, c])).values());
      // Sort by createdAt descending
      deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const paginated = deduped.slice(offset, offset + limit);
      const total = deduped.length;

      console.log(`[GET /api/circulars] FACULTY userId=${userId} divisions=[${facultyDivisionIds.join(",")}] → ${total} results (cached/merged)`);
      return ok(paginated, { total: Number(total), limit, offset });
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
