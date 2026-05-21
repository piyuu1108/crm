import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  timetableEntries,
  timetableSlots,
  divisions,
  facultySubjectAssignments,
  faculty,
  subjects,
} from "@/app/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { invalidateTimetableUpdated } from "@/app/lib/cache";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function requireHod(roles: string[]) {
  return roles.includes("hod") || roles.includes("admin");
}

// ─── GET /api/admin/timetable ─────────────────────────────────────────────────
// Fetch all timetable entries + conflict data for a given division
// Query params: divisionId (required)

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return err("Unauthorized", 401);
    if (!requireHod(auth.roles)) return err("Forbidden", 403);

    const divisionId = req.nextUrl.searchParams.get("divisionId");
    if (!divisionId) return err("divisionId is required", 400);

    const divId = Number(divisionId);
    if (isNaN(divId) || divId <= 0) return err("Invalid divisionId", 400);

    // 1. Get division details
    const [division] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, divId))
      .limit(1);

    if (!division) return err("Division not found", 404);

    // 2. Get all timetable entries for this division (scoped to division's semester)
    const entries = await db
      .select({
        id: timetableEntries.id,
        dayOfWeek: timetableEntries.dayOfWeek,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        subjectName: subjects.name,
        facultyName: faculty.name,
        assignmentId: timetableEntries.assignmentId,
        color: timetableEntries.color,
        isLab: timetableEntries.isLab,
        labId: timetableEntries.labId,
      })
      .from(timetableEntries)
      .innerJoin(
        facultySubjectAssignments,
        eq(timetableEntries.assignmentId, facultySubjectAssignments.id)
      )
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
      .where(
        and(
          eq(timetableEntries.divisionId, divId),
          eq(timetableEntries.semesterId, division.semesterId),
          eq(timetableEntries.isActive, true)
        )
      );

    // 3. Get faculty-subject assignments available for this division
    const assignments = await db
      .select({
        id: facultySubjectAssignments.id,
        facultyId: facultySubjectAssignments.facultyId,
        subjectId: facultySubjectAssignments.subjectId,
        facultyName: faculty.name,
        subjectName: subjects.name,
        subjectType: facultySubjectAssignments.subjectType,
      })
      .from(facultySubjectAssignments)
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
      .where(
        and(
          eq(facultySubjectAssignments.divisionId, divId),
          eq(facultySubjectAssignments.semesterId, division.semesterId)
        )
      );

    // 4. Get ALL timetable entries for the faculties assigned to this division across ALL semesters/divisions
    //    (needed for faculty conflict detection across different semesters)
    const divisionFacultyIds = [...new Set(assignments.map((a) => a.facultyId))];

    let facultyConflicts: Array<{
      facultyId: number;
      facultyName: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      divisionId: number;
      divisionName: string;
      subjectName: string;
      assignmentId: number;
    }> = [];

    if (divisionFacultyIds.length > 0) {
      facultyConflicts = await db
        .select({
          facultyId: facultySubjectAssignments.facultyId,
          facultyName: faculty.name,
          dayOfWeek: timetableEntries.dayOfWeek,
          startTime: timetableEntries.startTime,
          endTime: timetableEntries.endTime,
          divisionId: timetableEntries.divisionId,
          divisionName: divisions.displayName,
          subjectName: subjects.name,
          assignmentId: timetableEntries.assignmentId,
        })
        .from(timetableEntries)
        .innerJoin(
          facultySubjectAssignments,
          eq(timetableEntries.assignmentId, facultySubjectAssignments.id)
        )
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(divisions, eq(timetableEntries.divisionId, divisions.id))
        .where(
          and(
            inArray(facultySubjectAssignments.facultyId, divisionFacultyIds),
            eq(timetableEntries.isActive, true)
          )
        );
    }

    // 5. Get all entries that are labs to check for physical lab conflicts
    const labConflicts = await db
      .select({
        labId: timetableEntries.labId,
        dayOfWeek: timetableEntries.dayOfWeek,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        divisionId: timetableEntries.divisionId,
        divisionName: divisions.displayName,
        subjectName: subjects.name,
      })
      .from(timetableEntries)
      .innerJoin(
        facultySubjectAssignments,
        eq(timetableEntries.assignmentId, facultySubjectAssignments.id)
      )
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .innerJoin(divisions, eq(timetableEntries.divisionId, divisions.id))
      .where(
        and(
          eq(timetableEntries.isLab, true),
          eq(timetableEntries.isActive, true)
        )
      );

    // 6. Get all divisions for the selector dropdown
    const allDivisions = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        semesterNo: divisions.semesterNo,
        batchYear: divisions.batchYear,
        publishStatus: divisions.publishStatus,
      })
      .from(divisions);

    return ok({
      division: {
        id: division.id,
        displayName: division.displayName,
        specialization: division.specialization,
        semesterNo: division.semesterNo,
        batchYear: division.batchYear,
        semesterId: division.semesterId,
        publishStatus: division.publishStatus,
      },
      entries,
      assignments,
      facultyConflicts,
      labConflicts,
      allDivisions,
    });
  } catch (error) {
    console.error("[GET /api/admin/timetable]", error);
    return err("Internal server error", 500);
  }
}

// ─── POST /api/admin/timetable ────────────────────────────────────────────────
// Bulk save timetable entries for a division (replace all)

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return err("Unauthorized", 401);
    if (!requireHod(auth.roles)) return err("Forbidden", 403);

    const body = await req.json();
    const { divisionId, entries: newEntries } = body;

    if (!divisionId || !Array.isArray(newEntries)) {
      return err("divisionId and entries[] are required", 400);
    }

    const divId = Number(divisionId);

    // Get division
    const [division] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, divId))
      .limit(1);

    if (!division) return err("Division not found", 404);

    // Validation entries — check for missing fields
    for (const entry of newEntries) {
      if (!entry.dayOfWeek || !entry.startTime || !entry.endTime || !entry.assignmentId) {
        return err("Each entry must have dayOfWeek, startTime, endTime, assignmentId", 400);
      }
    }

    // Validate assignments exist and belong to this division
    const assignmentIds = [...new Set(newEntries.map((e: { assignmentId: number }) => e.assignmentId))];
    const validAssignments = await db
      .select({
        id: facultySubjectAssignments.id,
      })
      .from(facultySubjectAssignments)
      .where(
        and(
          inArray(facultySubjectAssignments.id, assignmentIds as number[]),
          eq(facultySubjectAssignments.divisionId, divId),
          eq(facultySubjectAssignments.semesterId, division.semesterId)
        )
      );

    const validAssignmentSet = new Set(validAssignments.map((a) => a.id));

    for (const aId of assignmentIds) {
      if (!validAssignmentSet.has(aId as number)) {
        return err(`Assignment ${aId} is not valid for this division`, 400);
      }
    }

    // ── Pre-load slot map for auto-resolution ──────────────────────────
    const allSlots = await db
      .select()
      .from(timetableSlots)
      .where(eq(timetableSlots.isBreak, false));

    const slotMap = new Map(
      allSlots.map((s) => [`${s.startTime}-${s.endTime}`, s.id])
    );

    // ── Execute all writes in a single transaction ────────────────────
    await db.transaction(async (tx) => {
      // Step 1: Deactivate existing timetable entries for this division/semester
      // ON DELETE SET NULL on attendance_sessions.timetable_id preserves
      // all attendance history — sessions just lose the timetable reference.
      await tx
        .update(timetableEntries)
        .set({ isActive: false })
        .where(
          and(
            eq(timetableEntries.divisionId, divId),
            eq(timetableEntries.semesterId, division.semesterId)
          )
        );

      // Step 2: Insert new entries with auto-resolved slotId
      if (newEntries.length > 0) {
        const inserts = newEntries.map((entry: {
          dayOfWeek: string;
          startTime: string;
          endTime: string;
          assignmentId: number;
          color?: string;
          isLab?: boolean;
          labId?: string | null;
        }) => {
          const resolvedSlotId = slotMap.get(`${entry.startTime}-${entry.endTime}`) ?? null;
          return {
            semesterId: division.semesterId,
            divisionId: divId,
            assignmentId: entry.assignmentId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            slotId: resolvedSlotId,
            color: entry.color || "#6366f1",
            isLab: entry.isLab || false,
            labId: entry.isLab ? entry.labId : null,
            isActive: true,
          };
        });

        await tx.insert(timetableEntries).values(inserts);
      }

      // Step 3: If division was published, revert to draft (edit after publish → draft)
      if (division.publishStatus === "published") {
        await tx
          .update(divisions)
          .set({ publishStatus: "draft" })
          .where(eq(divisions.id, divId));
      }
    });

    await invalidateTimetableUpdated(divId);

    return ok({ saved: newEntries.length, status: "draft" });
  } catch (error) {
    console.error("[POST /api/admin/timetable]", error);
    return err("Internal server error", 500);
  }
}
