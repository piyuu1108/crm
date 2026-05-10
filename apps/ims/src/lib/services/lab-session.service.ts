import { db } from "@/db";
import { labSessions, assignments, subjects, rooms, faculty, classes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface SessionInput {
  sessionType: "Theory" | "Lab";
  roomId: number | null;
  durationSlots: number;
}

/** Get all sessions for a single assignment */
export async function getSessionsByAssignment(assignmentId: number) {
  return await db
    .select({
      id: labSessions.id,
      assignmentId: labSessions.assignmentId,
      sessionType: labSessions.sessionType,
      roomId: labSessions.roomId,
      roomName: rooms.name,
      durationSlots: labSessions.durationSlots,
    })
    .from(labSessions)
    .leftJoin(rooms, eq(labSessions.roomId, rooms.id))
    .where(eq(labSessions.assignmentId, assignmentId))
    .orderBy(labSessions.id);
}

/** Get all sessions for all assignments of a given class (with subject + room info) */
export async function getSessionsByClass(classId: number) {
  return await db
    .select({
      id: labSessions.id,
      assignmentId: labSessions.assignmentId,
      sessionType: labSessions.sessionType,
      roomId: labSessions.roomId,
      roomName: rooms.name,
      durationSlots: labSessions.durationSlots,
      subjectId: subjects.id,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      subjectShortCode: subjects.shortCode,
      subjectCredit: subjects.credit,
      subjectType: subjects.type,
      facultyId: faculty.id,
      facultyCode: faculty.code,
      className: classes.name,
    })
    .from(labSessions)
    .innerJoin(assignments, eq(labSessions.assignmentId, assignments.id))
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .innerJoin(faculty, eq(assignments.facultyId, faculty.id))
    .innerJoin(classes, eq(assignments.classId, classes.id))
    .leftJoin(rooms, eq(labSessions.roomId, rooms.id))
    .where(eq(assignments.classId, classId))
    .orderBy(subjects.code, labSessions.id);
}

/** Get all sessions that reference a specific room (for delete guard + timetable) */
export async function getSessionsByRoom(roomId: number) {
  return await db
    .select({
      id: labSessions.id,
      assignmentId: labSessions.assignmentId,
      sessionType: labSessions.sessionType,
      durationSlots: labSessions.durationSlots,
      subjectCode: subjects.code,
      subjectShortCode: subjects.shortCode,
      className: classes.name,
      facultyCode: faculty.code,
    })
    .from(labSessions)
    .innerJoin(assignments, eq(labSessions.assignmentId, assignments.id))
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .innerJoin(classes, eq(assignments.classId, classes.id))
    .innerJoin(faculty, eq(assignments.facultyId, faculty.id))
    .where(eq(labSessions.roomId, roomId))
    .orderBy(subjects.code, labSessions.id);
}

/** Replace all sessions for an assignment (delete + bulk insert in transaction) */
export async function saveSessionsForAssignment(
  assignmentId: number,
  sessions: SessionInput[]
) {
  return await db.transaction(async (tx) => {
    // Delete existing sessions
    await tx.delete(labSessions).where(eq(labSessions.assignmentId, assignmentId));

    // Insert new ones
    if (sessions.length > 0) {
      const rows = sessions.map((s) => ({
        assignmentId,
        sessionType: s.sessionType as "Theory" | "Lab",
        roomId: s.sessionType === "Lab" ? s.roomId : null,
        durationSlots: s.sessionType === "Theory" ? 1 : s.durationSlots,
      }));
      await tx.insert(labSessions).values(rows);
    }

    // Return freshly inserted sessions
    return await tx
      .select()
      .from(labSessions)
      .where(eq(labSessions.assignmentId, assignmentId))
      .orderBy(labSessions.id);
  });
}
