import { db } from "@/db";
import {
  assignments,
  subjects,
  classes,
  faculty,
  specializations,
  timetables,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getWorkloadLimit } from "./settings.service";
import { getClassesForMatrix } from "./class.service";

export async function getAssignmentMatrix(
  courseId: number,
  semester: number | "all"
) {
  const subjectConditions = [eq(subjects.courseId, courseId)];
  if (semester !== "all") {
    subjectConditions.push(eq(subjects.semester, semester));
  }

  // 1. Get all subjects for this course (+ optional semester filter)
  const subjectRows = await db
    .select()
    .from(subjects)
    .where(and(...subjectConditions));

  // Sort subjects by code naturally descending (e.g. 503, 502, 501-2, 501)
  subjectRows.sort((a, b) => 
    b.code.localeCompare(a.code, undefined, { numeric: true, sensitivity: 'base' })
  );

  // 2. Get all classes (divisions) for this course (+ optional semester filter)
  const classRows = await getClassesForMatrix(courseId, semester);

  const assignmentConditions = [eq(subjects.courseId, courseId)];
  if (semester !== "all") {
    assignmentConditions.push(eq(subjects.semester, semester));
  }

  // 3. Get all assignments for these subjects + classes
  const allAssignments = await db
    .select({
      id: assignments.id,
      subjectId: assignments.subjectId,
      classId: assignments.classId,
      facultyId: assignments.facultyId,
      facultyCode: faculty.code,
      facultyName: faculty.name,
    })
    .from(assignments)
    .innerJoin(faculty, eq(assignments.facultyId, faculty.id))
    .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
    .where(and(...assignmentConditions));

  // 4. Compute workload for each faculty — single batch query (eliminates N+1)
  const workloadLimit = await getWorkloadLimit();
  const facultyIds = [...new Set(allAssignments.map((a) => a.facultyId))];

  const facultyWorkloads: Record<
    number,
    {
      name: string;
      code: string;
      totalLoad: number;
      limit: number;
      assignments: { subjectShortCode: string; className: string; semester: number; credit: number }[];
    }
  > = {};

  if (facultyIds.length > 0) {
    // Single query: get ALL assignments for ALL relevant faculty
    const allFacultyAssignments = await db
      .select({
        facultyId: assignments.facultyId,
        subjectCredit: subjects.credit,
        subjectShortCode: subjects.shortCode,
        className: classes.name,
        semester: subjects.semester,
      })
      .from(assignments)
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .where(inArray(assignments.facultyId, facultyIds));

    // Group by facultyId in memory
    const groupedByFaculty = new Map<
      number,
      { subjectCredit: number; subjectShortCode: string; className: string; semester: number }[]
    >();
    for (const row of allFacultyAssignments) {
      const existing = groupedByFaculty.get(row.facultyId) || [];
      existing.push(row);
      groupedByFaculty.set(row.facultyId, existing);
    }

    for (const fid of facultyIds) {
      const fRows = groupedByFaculty.get(fid) || [];
      const totalLoad = fRows.reduce((sum, a) => sum + a.subjectCredit, 0);
      const f = allAssignments.find((a) => a.facultyId === fid);
      facultyWorkloads[fid] = {
        name: f?.facultyName || "",
        code: f?.facultyCode || "",
        totalLoad,
        limit: workloadLimit,
        assignments: fRows.map((a) => ({
          subjectShortCode: a.subjectShortCode,
          className: a.className,
          semester: a.semester,
          credit: a.subjectCredit,
        })),
      };
    }
  }

  // 5. Build matrix: subject rows × class columns (from 1 to maxDivision)
  const maxDiv = classRows.length > 0 ? Math.max(...classRows.map(c => c.divisionNumber)) : 0;
  
  // Pad global classes for table headers
  const paddedClasses = Array.from({ length: maxDiv }, (_, i) => {
    const div = i + 1;
    const cls = classRows.find(c => c.divisionNumber === div);
    return cls ? { ...cls, isDummy: false } : { id: -div, name: "-", divisionNumber: div, specShortCode: "-", isDummy: true };
  });

  const matrix = subjectRows.map((subject) => {
    const cells = Array.from({ length: maxDiv }, (_, i) => {
      const div = i + 1;
      const actualClass = classRows.find(c => c.divisionNumber === div && c.semester === subject.semester);

      if (!actualClass) {
        return { isBlocked: true, classId: -div, className: "-", divisionNumber: div, assignmentId: null, facultyId: null, facultyCode: null, facultyName: null, workload: null };
      }

      const assignment = allAssignments.find(
        (a) => a.subjectId === subject.id && a.classId === actualClass.id
      );
      return {
        isBlocked: false,
        classId: actualClass.id,
        className: actualClass.name,
        divisionNumber: div,
        assignmentId: assignment?.id || null,
        facultyId: assignment?.facultyId || null,
        facultyCode: assignment?.facultyCode || null,
        facultyName: assignment?.facultyName || null,
        workload: assignment?.facultyId
          ? facultyWorkloads[assignment.facultyId]
          : null,
      };
    });

    return {
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      subjectShortCode: subject.shortCode,
      subjectCredit: subject.credit,
      subjectType: subject.type,
      semester: subject.semester,
      cells,
    };
  });

  return {
    subjects: subjectRows,
    classes: paddedClasses,
    matrix,
    workloadLimit,
    facultyWorkloads,
  };
}

export async function createAssignment(
  subjectId: number,
  classId: number,
  facultyId: number
) {
  // Validate that subject and class belong to the same semester
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
  const [cls] = await db.select().from(classes).where(eq(classes.id, classId));
  
  if (!subject) throw new Error("Subject not found");
  if (!cls) throw new Error("Class not found");
  if (subject.semester !== cls.semester) {
    throw new Error(`Cannot assign: Subject is in Semester ${subject.semester} but Class is in Semester ${cls.semester}`);
  }

  // Check for duplicate
  const existing = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.subjectId, subjectId),
        eq(assignments.classId, classId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing assignment with new faculty
    const [updated] = await db
      .update(assignments)
      .set({ facultyId })
      .where(eq(assignments.id, existing[0].id))
      .returning();

    // Sync the change to existing timetables (Live Reference System)
    await db
      .update(timetables)
      .set({ facultyId })
      .where(eq(timetables.assignmentId, existing[0].id));

    return updated;
  }

  const [a] = await db
    .insert(assignments)
    .values({ subjectId, classId, facultyId })
    .returning();
  return a;
}

export async function deleteAssignment(id: number) {
  await db.delete(assignments).where(eq(assignments.id, id));
}

export async function deleteAssignmentByCell(
  subjectId: number,
  classId: number
) {
  await db
    .delete(assignments)
    .where(
      and(
        eq(assignments.subjectId, subjectId),
        eq(assignments.classId, classId)
      )
    );
}
