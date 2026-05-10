import { db } from "@/db";
import { subjects, assignments, faculty, classes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function getAllSubjects(courseId?: number, semester?: number) {
  let conditions = [];
  if (courseId) conditions.push(eq(subjects.courseId, courseId));
  if (semester) conditions.push(eq(subjects.semester, semester));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(subjects)
    .where(whereClause)
    .orderBy(subjects.code);

  if (rows.length === 0) return [];

  // Single query for ALL assignments across all fetched subjects (eliminates N+1)
  const subjectIds = rows.map((s) => s.id);
  const allAssignments = await db
    .select({
      id: assignments.id,
      subjectId: assignments.subjectId,
      classId: assignments.classId,
      facultyId: assignments.facultyId,
      className: classes.name,
      facultyCode: faculty.code,
      facultyName: faculty.name,
    })
    .from(assignments)
    .innerJoin(classes, eq(assignments.classId, classes.id))
    .innerJoin(faculty, eq(assignments.facultyId, faculty.id))
    .where(inArray(assignments.subjectId, subjectIds));

  // Group assignments by subjectId in memory
  const assignmentsBySubject = new Map<number, typeof allAssignments>();
  for (const a of allAssignments) {
    const existing = assignmentsBySubject.get(a.subjectId) || [];
    existing.push(a);
    assignmentsBySubject.set(a.subjectId, existing);
  }

  return rows.map((s) => ({
    ...s,
    assignments: assignmentsBySubject.get(s.id) || [],
  }));
}

export async function getSubjectById(id: number) {
  const [s] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, id))
    .limit(1);
  return s || null;
}

export async function createSubject(data: {
  code: string;
  name: string;
  shortCode: string;
  credit: number;
  type: "Theory" | "Practical" | "Both" | "ProjectMinor" | "ProjectMajor";
  courseId: number;
  semester: number;
}) {
  const [s] = await db.insert(subjects).values(data).returning();
  return s;
}

export async function updateSubject(
  id: number,
  data: Partial<{
    code: string;
    name: string;
    shortCode: string;
    credit: number;
    type: "Theory" | "Practical" | "Both" | "ProjectMinor" | "ProjectMajor";
    courseId: number;
    semester: number;
  }>
) {
  const [s] = await db
    .update(subjects)
    .set(data)
    .where(eq(subjects.id, id))
    .returning();
  return s;
}

export async function deleteSubject(id: number) {
  await db.delete(subjects).where(eq(subjects.id, id));
}
