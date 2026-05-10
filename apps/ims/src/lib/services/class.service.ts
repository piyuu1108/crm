import { db } from "@/db";
import {
  classes,
  courses,
  specializations,
  assignments,
  subjects,
  faculty,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { generateClassName } from "@/lib/validators";

export async function getAllClasses(courseId?: number, semester?: number) {
  let conditions = [];
  if (courseId) conditions.push(eq(classes.courseId, courseId));
  if (semester) conditions.push(eq(classes.semester, semester));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      year: classes.year,
      semester: classes.semester,
      courseId: classes.courseId,
      specializationId: classes.specializationId,
      divisionNumber: classes.divisionNumber,
      createdAt: classes.createdAt,
      specName: specializations.name,
      specShortCode: specializations.shortCode,
    })
    .from(classes)
    .innerJoin(
      specializations,
      eq(classes.specializationId, specializations.id)
    )
    .where(whereClause)
    .orderBy(classes.divisionNumber);

  if (rows.length === 0) return [];

  // Single query for ALL assignments across all fetched classes (eliminates N+1)
  const classIds = rows.map((c) => c.id);
  const allAssignments = await db
    .select({
      id: assignments.id,
      classId: assignments.classId,
      subjectId: assignments.subjectId,
      facultyId: assignments.facultyId,
      subjectShortCode: subjects.shortCode,
      subjectName: subjects.name,
      facultyCode: faculty.code,
      facultyName: faculty.name,
    })
    .from(assignments)
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .innerJoin(faculty, eq(assignments.facultyId, faculty.id))
    .where(inArray(assignments.classId, classIds));

  // Group assignments by classId in memory
  const assignmentsByClass = new Map<number, typeof allAssignments>();
  for (const a of allAssignments) {
    const existing = assignmentsByClass.get(a.classId) || [];
    existing.push(a);
    assignmentsByClass.set(a.classId, existing);
  }

  return rows.map((c) => ({
    ...c,
    assignments: assignmentsByClass.get(c.id) || [],
  }));
}

export async function getClassById(id: number) {
  const [c] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, id))
    .limit(1);
  return c || null;
}

export async function createClass(data: {
  year: number;
  semester: number;
  courseId: number;
  specializationId: number;
  divisionNumber: number;
}) {
  // Get course name and specialization short code for naming
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, data.courseId))
    .limit(1);
  const [spec] = await db
    .select()
    .from(specializations)
    .where(eq(specializations.id, data.specializationId))
    .limit(1);

  if (!course || !spec) throw new Error("Invalid course or specialization");

  // Validate division number uniqueness per SRS §7.2
  const existing = await db
    .select()
    .from(classes)
    .where(
      and(
        eq(classes.semester, data.semester),
        eq(classes.courseId, data.courseId),
        eq(classes.divisionNumber, data.divisionNumber)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error(
      `Division number ${data.divisionNumber} already exists for this semester and course`
    );
  }

  const name = generateClassName(
    data.year,
    course.name,
    spec.shortCode,
    data.divisionNumber
  );

  const [c] = await db
    .insert(classes)
    .values({ ...data, name })
    .returning();
  return c;
}

export async function deleteClass(id: number) {
  await db.delete(classes).where(eq(classes.id, id));
}

export async function getMaxDivision(courseId: number, semester: number) {
  const rows = await db
    .select({ divisionNumber: classes.divisionNumber })
    .from(classes)
    .where(
      and(eq(classes.courseId, courseId), eq(classes.semester, semester))
    )
    .orderBy(classes.divisionNumber);
  return rows.length > 0 ? Math.max(...rows.map((r) => r.divisionNumber)) : 0;
}

export async function getClassesForMatrix(
  courseId: number,
  semester: number | "all"
) {
  const conditions = [eq(classes.courseId, courseId)];
  if (semester !== "all") {
    conditions.push(eq(classes.semester, semester));
  }
  return db
    .select({
      id: classes.id,
      name: classes.name,
      divisionNumber: classes.divisionNumber,
      semester: classes.semester,
      specShortCode: specializations.shortCode,
    })
    .from(classes)
    .innerJoin(
      specializations,
      eq(classes.specializationId, specializations.id)
    )
    .where(and(...conditions))
    .orderBy(classes.divisionNumber);
}
