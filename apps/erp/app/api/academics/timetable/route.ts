import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  students,
  timetableEntries,
  divisions,
  faculty,
  counselorDivisionAssignments,
  facultySubjectAssignments,
  subjects,
} from "@/app/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { remember, cacheKeys, TTL } from "@/app/lib/cache";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) return err("Unauthorized", 401);

    const { userId, roles: rolesArray, activeRole } = auth;

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
        cacheKeys.timetable(auth.divisionId),
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
        cacheKeys.timetableFaculty(userId),
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

      return ok({ role: activeRole, entries });

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
            cacheKeys.timetable(divId),
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
