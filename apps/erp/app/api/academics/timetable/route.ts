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
      const [student] = await db
        .select({
          divisionId: students.currentDivisionId,
          semesterId: divisions.semesterId,
          publishStatus: divisions.publishStatus,
          divisionName: students.currentDivisionName
        })
        .from(students)
        .leftJoin(divisions, eq(divisions.id, students.currentDivisionId))
        .where(eq(students.id, userId))
        .limit(1);

      if (!student || !student.divisionId) {
        return ok({ role: "student", isPublished: false, entries: [], divisionName: "" });
      }

      if (student.publishStatus !== "published") {
        return ok({ role: "student", isPublished: false, entries: [], divisionName: student.divisionName });
      }

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
            eq(timetableEntries.divisionId, student.divisionId),
            eq(timetableEntries.semesterId, student.semesterId!),
            eq(timetableEntries.isActive, true)
          )
        );

      return ok({ role: "student", isPublished: true, entries, divisionName: student.divisionName });

    } else if (activeRole === "faculty" || activeRole === "hod") {
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
            eq(facultySubjectAssignments.facultyId, userId),
            eq(timetableEntries.isActive, true)
          )
        );

      return ok({ role: activeRole, entries });

    } else if (activeRole === "counselor") {
      const assignments = await db
        .select({
          divisionId: counselorDivisionAssignments.divisionId,
          semesterId: counselorDivisionAssignments.semesterId,
          divisionName: divisions.displayName,
        })
        .from(counselorDivisionAssignments)
        .innerJoin(divisions, eq(counselorDivisionAssignments.divisionId, divisions.id))
        .where(eq(counselorDivisionAssignments.facultyId, userId));

      if (assignments.length === 0) {
        return ok({ role: "counselor", entries: [], divisionName: "" });
      }

      const divisionIds = assignments.map(a => a.divisionId);
      const divisionNames = assignments.map(a => a.divisionName).join(", ");
      
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
            sql`${timetableEntries.divisionId} IN (${sql.join(divisionIds.map(id => sql`${id}`), sql`, `)})`,
            eq(timetableEntries.isActive, true)
          )
        );

      return ok({ role: "counselor", entries, divisionName: divisionNames });

    }

    return err("Invalid role", 400);
  } catch (error) {
    console.error("[GET /api/academics/timetable]", error);
    return err("Internal server error", 500);
  }
}
