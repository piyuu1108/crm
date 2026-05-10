import { db } from "@/db";
import { faculty, assignments, subjects, classes } from "@/db/schema";
import { eq, ilike, or, sql, inArray } from "drizzle-orm";

export async function getAllFaculty(courseId?: number) {
  const baseQuery = db
    .select({
      id: faculty.id,
      name: faculty.name,
      code: faculty.code,
      courseId: faculty.courseId,
      createdAt: faculty.createdAt,
    })
    .from(faculty)
    .orderBy(faculty.code);

  const rows = courseId
    ? await baseQuery.where(eq(faculty.courseId, courseId))
    : await baseQuery;

  if (rows.length === 0) return [];

  // Single query for ALL assignments across all fetched faculty (eliminates N+1)
  const facultyIds = rows.map((f) => f.id);
  const allAssignments = await db
    .select({
      id: assignments.id,
      facultyId: assignments.facultyId,
      subjectId: assignments.subjectId,
      classId: assignments.classId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      subjectShortCode: subjects.shortCode,
      subjectCredit: subjects.credit,
      className: classes.name,
    })
    .from(assignments)
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .innerJoin(classes, eq(assignments.classId, classes.id))
    .where(inArray(assignments.facultyId, facultyIds));

  // Group assignments by facultyId in memory
  const assignmentsByFaculty = new Map<number, typeof allAssignments>();
  for (const a of allAssignments) {
    const existing = assignmentsByFaculty.get(a.facultyId) || [];
    existing.push(a);
    assignmentsByFaculty.set(a.facultyId, existing);
  }

  return rows.map((f) => {
    const fAssignments = assignmentsByFaculty.get(f.id) || [];
    const totalLoad = fAssignments.reduce((sum, a) => sum + a.subjectCredit, 0);
    return { ...f, assignments: fAssignments, totalLoad };
  });
}

export async function getFacultyById(id: number) {
  const [f] = await db
    .select()
    .from(faculty)
    .where(eq(faculty.id, id))
    .limit(1);
  return f || null;
}

export async function createFaculty(
  name: string,
  code: string,
  courseId: number
) {
  const [f] = await db
    .insert(faculty)
    .values({ name, code, courseId })
    .returning();
  return f;
}

export async function updateFaculty(
  id: number,
  data: { name?: string; code?: string; courseId?: number }
) {
  const [f] = await db
    .update(faculty)
    .set(data)
    .where(eq(faculty.id, id))
    .returning();
  return f;
}

export async function deleteFaculty(id: number) {
  await db.delete(faculty).where(eq(faculty.id, id));
}

export async function searchFaculty(query: string, courseId?: number) {
  const pattern = `%${query}%`;
  let rows;
  if (courseId) {
    rows = await db
      .select({
        id: faculty.id,
        name: faculty.name,
        code: faculty.code,
      })
      .from(faculty)
      .where(
        sql`${faculty.courseId} = ${courseId} AND (${faculty.code} ILIKE ${pattern} OR ${faculty.name} ILIKE ${pattern})`
      )
      .limit(10);
  } else {
    rows = await db
      .select({
        id: faculty.id,
        name: faculty.name,
        code: faculty.code,
      })
      .from(faculty)
      .where(
        or(ilike(faculty.code, pattern), ilike(faculty.name, pattern))
      )
      .limit(10);
  }
  return rows;
}

export async function getFacultyWorkload(facultyId: number) {
  const rows = await db
    .select({
      subjectCredit: subjects.credit,
      subjectShortCode: subjects.shortCode,
      className: classes.name,
    })
    .from(assignments)
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .innerJoin(classes, eq(assignments.classId, classes.id))
    .where(eq(assignments.facultyId, facultyId));

  const totalLoad = rows.reduce((sum, r) => sum + r.subjectCredit, 0);
  return { totalLoad, assignments: rows };
}
