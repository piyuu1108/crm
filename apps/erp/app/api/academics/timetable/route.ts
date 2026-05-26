import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/app/lib/api-auth";
import { hasPermission } from "@/app/lib/permissions";
import { db } from "@/app/lib/db";
import {
  students,
  timetableEntries,
  divisions,
  faculty,
  counselorDivisionAssignments,
  facultySubjectAssignments,
  subjects,
  timetableSlots,
  facultyRequestProxies,
} from "@/app/lib/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { remember, cacheTags, TTL } from "@/app/lib/cache";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getUpcomingProxiesForFaculty(facultyId: number) {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  const todayDateStr = localDate.toISOString().split("T")[0];

  const origFac = alias(faculty, "orig_fac");

  return db
    .select({
      id: facultyRequestProxies.id,
      date: facultyRequestProxies.date,
      slotLabel: timetableSlots.label,
      startTime: timetableSlots.startTime,
      endTime: timetableSlots.endTime,
      originalFacultyName: origFac.name,
      divisionName: divisions.displayName,
      subjectName: subjects.name,
      status: facultyRequestProxies.status,
    })
    .from(facultyRequestProxies)
    .innerJoin(timetableSlots, eq(facultyRequestProxies.slotId, timetableSlots.id))
    .innerJoin(divisions, eq(facultyRequestProxies.divisionId, divisions.id))
    .innerJoin(subjects, eq(facultyRequestProxies.subjectId, subjects.id))
    .innerJoin(origFac, eq(facultyRequestProxies.originalFacultyId, origFac.id))
    .where(
      and(
        eq(facultyRequestProxies.proxyFacultyId, facultyId),
        gte(facultyRequestProxies.date, todayDateStr)
      )
    )
    .orderBy(facultyRequestProxies.date, timetableSlots.startTime);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAnyPermission(req, ["timetable.view_any", "timetable.view_own"]);
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole } = auth;
    const resolvedRole = activeRole;
    const { searchParams } = new URL(req.url);

    const isGlobalAdmin = hasPermission(resolvedRole, "timetable.view_any");
    if (isGlobalAdmin) {
      const type = searchParams.get("type"); // "class" or "faculty"
      const idVal = searchParams.get("id");
      if (!type || !idVal) {
        return ok({ role: "admin", entries: [] });
      }

      const id = parseInt(idVal, 10);
      if (isNaN(id)) {
        return err("Invalid ID", 400);
      }

      if (type === "class") {
        const entries = await db
          .select({
            id: timetableEntries.id,
            dayOfWeek: timetableEntries.dayOfWeek,
            startTime: timetableEntries.startTime,
            endTime: timetableEntries.endTime,
            subjectName: subjects.name,
            facultyName: faculty.name,
            divisionName: divisions.displayName,
            color: timetableEntries.color,
            isLab: timetableEntries.isLab,
            labId: timetableEntries.labId,
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
              eq(timetableEntries.divisionId, id),
              eq(timetableEntries.isActive, true)
            )
          );
        return ok({ role: "admin", type: "class", targetId: id, entries });
      } else if (type === "faculty") {
        const entries = await db
          .select({
            id: timetableEntries.id,
            dayOfWeek: timetableEntries.dayOfWeek,
            startTime: timetableEntries.startTime,
            endTime: timetableEntries.endTime,
            subjectName: subjects.name,
            facultyName: faculty.name,
            divisionName: divisions.displayName,
            color: timetableEntries.color,
            isLab: timetableEntries.isLab,
            labId: timetableEntries.labId,
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
              eq(facultySubjectAssignments.facultyId, id),
              eq(timetableEntries.isActive, true)
            )
          );
        const upcomingProxies = await getUpcomingProxiesForFaculty(id);
        return ok({ role: "admin", type: "faculty", targetId: id, entries, upcomingProxies });
      } else {
        return err("Invalid type", 400);
      }
    }

    if (activeRole === "student") {
      if (!auth.divisionId || !auth.semesterId) {
        return ok({ role: "student", isPublished: false, entries: [], divisionName: "" });
      }

      const [div] = await db
        .select({
          publishStatus: divisions.publishStatus,
          displayName: divisions.displayName,
        })
        .from(divisions)
        .where(eq(divisions.id, auth.divisionId))
        .limit(1);

      if (!div) {
        return ok({ role: "student", isPublished: false, entries: [], divisionName: "" });
      }

      if (div.publishStatus !== "published") {
        return ok({ role: "student", isPublished: false, entries: [], divisionName: div.displayName });
      }

      const entries = await remember(
        cacheTags.timetable.division(auth.divisionId),
        TTL.TIMETABLE,
        async () => {
          return db
            .select({
              id: timetableEntries.id,
              dayOfWeek: timetableEntries.dayOfWeek,
              startTime: timetableEntries.startTime,
              endTime: timetableEntries.endTime,
              subjectName: subjects.name,
              facultyName: faculty.name,
              divisionName: divisions.displayName,
              color: timetableEntries.color,
              isLab: timetableEntries.isLab,
              labId: timetableEntries.labId,
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
                eq(timetableEntries.divisionId, auth.divisionId!),
                eq(timetableEntries.isActive, true)
              )
            );
        }
      );

      return ok({ role: "student", isPublished: true, entries, divisionName: div.displayName });

    } else if (activeRole === "faculty" || activeRole === "hod") {
      const entries = await remember(
        cacheTags.timetable.faculty(userId),
        TTL.TIMETABLE,
        async () => {
          return db
            .select({
              id: timetableEntries.id,
              dayOfWeek: timetableEntries.dayOfWeek,
              startTime: timetableEntries.startTime,
              endTime: timetableEntries.endTime,
              subjectName: subjects.name,
              facultyName: faculty.name,
              divisionName: divisions.displayName,
              color: timetableEntries.color,
              isLab: timetableEntries.isLab,
              labId: timetableEntries.labId,
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
                eq(facultySubjectAssignments.facultyId, userId),
                eq(timetableEntries.isActive, true)
              )
            );
        }
      );

      const upcomingProxies = await getUpcomingProxiesForFaculty(userId);
      return ok({ role: activeRole, entries, upcomingProxies });

    } else if (activeRole === "counselor") {
      const divisionIds = auth.counselorDivisionIds ?? [];
      if (divisionIds.length === 0) {
        return ok({ role: "counselor", entries: [], divisionName: "" });
      }

      const divisionDetails = await db
        .select({
          divisionName: divisions.displayName,
        })
        .from(divisions)
        .where(
          sql`${divisions.id} IN (${sql.join(
            divisionIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );

      const divisionNames = divisionDetails.map(a => a.divisionName).join(", ");
      
      const allEntries = await Promise.all(
        divisionIds.map((divId) =>
          remember(
            cacheTags.timetable.division(divId),
            TTL.TIMETABLE,
            async () => {
              return db
                .select({
                  id: timetableEntries.id,
                  dayOfWeek: timetableEntries.dayOfWeek,
                  startTime: timetableEntries.startTime,
                  endTime: timetableEntries.endTime,
                  subjectName: subjects.name,
                  facultyName: faculty.name,
                  divisionName: divisions.displayName,
                  color: timetableEntries.color,
                  isLab: timetableEntries.isLab,
                  labId: timetableEntries.labId,
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
                    eq(timetableEntries.divisionId, divId),
                    eq(timetableEntries.isActive, true)
                  )
                );
            }
          )
        )
      );

      return ok({ role: "counselor", entries: allEntries.flat(), divisionName: divisionNames });

    }

    return err("Invalid role", 400);
  } catch (error) {
    console.error("[GET /api/academics/timetable]", error);
    return err("Internal server error", 500);
  }
}
