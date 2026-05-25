import { db } from "../db";
import {
  timetableEntries,
  facultySubjectAssignments,
  faculty,
  divisions,
  subjects,
} from "../schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const entries = await db
    .select({
      id: timetableEntries.id,
      dayOfWeek: timetableEntries.dayOfWeek,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      slotId: timetableEntries.slotId,
      facultyId: facultySubjectAssignments.facultyId,
      facultyName: faculty.name,
      divisionName: divisions.displayName,
      subjectName: subjects.name,
    })
    .from(timetableEntries)
    .innerJoin(
      facultySubjectAssignments,
      eq(timetableEntries.assignmentId, facultySubjectAssignments.id)
    )
    .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
    .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
    .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
    .limit(10);

  console.log("=== TIMETABLE ENTRIES ===");
  entries.forEach(e => {
    console.log(`ID: ${e.id}, Day: ${e.dayOfWeek}, Time: ${e.startTime}-${e.endTime}, slotId: ${e.slotId}, Faculty: ${e.facultyName}, Division: ${e.divisionName}, Subject: ${e.subjectName}`);
  });
  console.log("=========================");
}

main().catch(console.error);
