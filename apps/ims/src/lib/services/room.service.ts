import { db } from "@/db";
import { rooms, labSessions } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export async function getAllRooms() {
  return await db.select().from(rooms).orderBy(asc(rooms.name));
}

export async function createRoom(data: { name: string }) {
  // Case-insensitive check handled by application logic here, or we let Postgres handle if collation supports it.
  // We'll explicitly check for case-insensitive duplicate to be safe.
  const existing = await db
    .select()
    .from(rooms)
    .where(sql`LOWER(${rooms.name}) = LOWER(${data.name})`)
    .limit(1);

  if (existing.length > 0) {
    const error: any = new Error("Room name already exists");
    error.code = "23505";
    throw error;
  }

  const [inserted] = await db
    .insert(rooms)
    .values({ name: data.name, isLab: true })
    .returning();
  return inserted;
}

export async function updateRoom(id: number, data: { name: string }) {
  const existing = await db
    .select()
    .from(rooms)
    .where(sql`LOWER(${rooms.name}) = LOWER(${data.name}) AND ${rooms.id} != ${id}`)
    .limit(1);

  if (existing.length > 0) {
    const error: any = new Error("Room name already exists");
    error.code = "23505";
    throw error;
  }

  const [updated] = await db
    .update(rooms)
    .set({ name: data.name })
    .where(eq(rooms.id, id))
    .returning();
  return updated;
}

export async function deleteRoom(id: number) {
  // Check if room is used in any lab sessions
  const usedSessions = await db
    .select({ id: labSessions.id })
    .from(labSessions)
    .where(eq(labSessions.roomId, id))
    .limit(1);

  if (usedSessions.length > 0) {
    const error: any = new Error(
      "Cannot delete this lab — it is referenced by existing session configurations"
    );
    error.code = "IN_USE";
    throw error;
  }

  await db.delete(rooms).where(eq(rooms.id, id));
}

export async function getRoomTimetableMatrix(roomId: number) {
  // Mock timetable grid for now as requested. 
  // Rows: Lecture 1 to 5, Cols: Mon to Sat
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const matrix = Array.from({ length: 5 }).map((_, lectureIndex) => {
    return {
      lectureNumber: lectureIndex + 1,
      days: days.map(day => ({
        day,
        assigned: false,
        className: null,
        subjectCode: null,
        subjectName: null,
        facultyInitials: null,
      })),
    };
  });

  return matrix;
}
