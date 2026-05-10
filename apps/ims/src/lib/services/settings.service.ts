import { db } from "@/db";
import { settings, courses, specializations } from "@/db/schema";
import { eq } from "drizzle-orm";

const WORKLOAD_KEY = "maxWeeklyWorkload";
const DEFAULT_WORKLOAD = 18;

export async function getWorkloadLimit(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, WORKLOAD_KEY))
    .limit(1);
  return row ? parseInt(row.value, 10) : DEFAULT_WORKLOAD;
}

export async function setWorkloadLimit(value: number) {
  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, WORKLOAD_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(settings)
      .set({ value: String(value) })
      .where(eq(settings.key, WORKLOAD_KEY));
  } else {
    await db.insert(settings).values({ key: WORKLOAD_KEY, value: String(value) });
  }
}

export async function getAllCourses() {
  return db.select().from(courses).orderBy(courses.name);
}

export async function createCourse(name: string) {
  const [course] = await db.insert(courses).values({ name }).returning();
  return course;
}

export async function updateCourse(id: number, name: string) {
  const [course] = await db
    .update(courses)
    .set({ name })
    .where(eq(courses.id, id))
    .returning();
  return course;
}

export async function deleteCourse(id: number) {
  await db.delete(courses).where(eq(courses.id, id));
}

export async function getAllSpecializations(courseId?: number) {
  if (courseId) {
    return db
      .select()
      .from(specializations)
      .where(eq(specializations.courseId, courseId))
      .orderBy(specializations.name);
  }
  return db.select().from(specializations).orderBy(specializations.name);
}

export async function createSpecialization(
  name: string,
  shortCode: string,
  courseId: number
) {
  const [spec] = await db
    .insert(specializations)
    .values({ name, shortCode, courseId })
    .returning();
  return spec;
}

export async function updateSpecialization(
  id: number,
  data: { name?: string; shortCode?: string; courseId?: number }
) {
  const [spec] = await db
    .update(specializations)
    .set(data)
    .where(eq(specializations.id, id))
    .returning();
  return spec;
}

export async function deleteSpecialization(id: number) {
  await db.delete(specializations).where(eq(specializations.id, id));
}
