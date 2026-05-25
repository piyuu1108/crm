import { eq, inArray, and, sql } from "drizzle-orm";
import { db } from "@/app/lib/db";
import { cacheTags, clearCache } from "@/app/lib/cache";
import {
  faculty,
  subjects,
  divisions,
  facultySubjectAssignments,
  timetableEntries,
  rooms,
  students,
  timetableSlots,
} from "@/app/lib/schema";
import { publishNotification } from "@/app/lib/notifications";
import { SimplifiedPayload, ValidationError } from "./timetable-validator";

async function ensureQuizPlaceholderEntities() {
  // 1. Check if QUIZ faculty exists
  const [quizFaculty] = await db
    .select({ id: faculty.id })
    .from(faculty)
    .where(eq(faculty.facultyCode, "QUIZ"))
    .limit(1);

  if (!quizFaculty) {
    await db.insert(faculty).values({
      facultyCode: "QUIZ",
      name: "Quiz Placeholder",
      email: "quiz-placeholder@erp.local",
      mobile: "0000000000",
      passwordHash: "placeholder",
      courseId: 2, // BCA course — quiz placeholder belongs to the default course
    });
  }

  // 2. Check if QUIZ subject exists
  const [quizSubject] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(eq(subjects.code, "QUIZ"))
    .limit(1);

  if (!quizSubject) {
    await db.insert(subjects).values({
      code: "QUIZ",
      name: "Quiz",
      subjectType: "theory",
      courseId: 2, // BCA course — quiz placeholder belongs to the default course
    });
  }
}

export async function processTimetablePublish(payloads: SimplifiedPayload[]) {
  // Ensure "QUIZ" placeholder entities exist in the database
  await ensureQuizPlaceholderEntities();
  // Extract Unique Keys
  const facultyCodes = Array.from(new Set(payloads.map((p) => p.facultyCode)));
  const subjectCodes = Array.from(new Set(payloads.map((p) => p.subjectCode)));
  const classCodes = Array.from(new Set(payloads.map((p) => p.classCode)));

  const existingFaculties = facultyCodes.length > 0 
    ? await db.select({ id: faculty.id, code: faculty.facultyCode, name: faculty.name }).from(faculty).where(inArray(faculty.facultyCode, facultyCodes))
    : [];

  const existingSubjects = subjectCodes.length > 0 
    ? await db.select({ id: subjects.id, code: subjects.code, name: subjects.name, type: subjects.subjectType }).from(subjects).where(inArray(subjects.code, subjectCodes))
    : [];

  const existingClasses = classCodes.length > 0 
    ? await db.select({ id: divisions.id, code: divisions.displayName, semesterId: divisions.semesterId }).from(divisions).where(inArray(divisions.displayName, classCodes))
    : [];

  const facultyMap = new Map(existingFaculties.map((f) => [f.code, f]));
  const subjectMap = new Map(existingSubjects.map((s) => [s.code, s]));
  const classMap = new Map(existingClasses.map((c) => [c.code, c]));

  const errors: ValidationError[] = [];

  // Validate all references
  for (const fCode of facultyCodes) {
    if (!facultyMap.has(fCode)) {
      errors.push({ type: "faculty_not_found", code: fCode, message: `Faculty code '${fCode}' not found.` });
    }
  }
  for (const sCode of subjectCodes) {
    if (!subjectMap.has(sCode)) {
      errors.push({ type: "subject_not_found", code: sCode, message: `Subject code '${sCode}' not found.` });
    }
  }
  for (const cCode of classCodes) {
    if (!classMap.has(cCode)) {
      errors.push({ type: "class_not_found", code: cCode, message: `Class code '${cCode}' not found.` });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const divisionIds = Array.from(classMap.values()).map(c => c.id);

  // Extract unique labs
  const labsToCreate = new Set<string>();
  payloads.forEach(p => {
    p.lectures.forEach(l => {
      if (l.lab) labsToCreate.add(l.lab);
    });
  });

  const slotTimes: Record<number, { start: string; end: string }> = {
    1: { start: "07:55:00", end: "08:50:00" },
    2: { start: "08:50:00", end: "09:40:00" },
    3: { start: "09:50:00", end: "10:40:00" },
    4: { start: "10:40:00", end: "11:30:00" },
    5: { start: "11:30:00", end: "12:20:00" },
  };

  try {
    await db.transaction(async (tx) => {
      // A. Delete existing timetable entries for these divisions (only for their current active semester)
      for (const div of classMap.values()) {
        await tx.delete(timetableEntries)
          .where(
            and(
              eq(timetableEntries.divisionId, div.id),
              eq(timetableEntries.semesterId, div.semesterId)
            )
          );
      }

      // B. Delete existing faculty-subject assignments for these divisions (only for their current active semester, resilient to references)
      for (const div of classMap.values()) {
        try {
          await tx.delete(facultySubjectAssignments)
            .where(
              and(
                eq(facultySubjectAssignments.divisionId, div.id),
                eq(facultySubjectAssignments.semesterId, div.semesterId)
              )
            );
        } catch (assignmentDeleteError) {
          console.warn(`[processTimetablePublish] Could not delete faculty-subject assignments for division ${div.id} in semester ${div.semesterId}:`, assignmentDeleteError);
        }
      }

      // C. Delete rooms registered as labs that are in the incoming payload so they are cleanly recreated
      if (labsToCreate.size > 0) {
        await tx.delete(rooms)
          .where(
            and(
              eq(rooms.isLab, true),
              inArray(rooms.code, Array.from(labsToCreate))
            )
          );
      }

      // 1. Re-insert Rooms
      if (labsToCreate.size > 0) {
        const roomInserts = Array.from(labsToCreate).map(code => ({
          code,
          name: code,
          isLab: true,
        }));
        
        await tx.insert(rooms)
          .values(roomInserts)
          .onConflictDoUpdate({
            target: rooms.code,
            set: {
              name: sql`EXCLUDED.name`,
              isLab: sql`EXCLUDED.is_lab`,
            }
          });
      }

      // 2. Upsert Faculty Subject Assignments
      const assignmentInserts = payloads.map(p => {
        const f = facultyMap.get(p.facultyCode)!;
        const s = subjectMap.get(p.subjectCode)!;
        const c = classMap.get(p.classCode)!;
        
        return {
          semesterId: c.semesterId,
          facultyId: f.id,
          subjectId: s.id,
          divisionId: c.id,
          subjectType: s.type, 
        };
      });

      if (assignmentInserts.length > 0) {
        await tx.insert(facultySubjectAssignments)
          .values(assignmentInserts)
          .onConflictDoNothing({
            target: [
              facultySubjectAssignments.semesterId,
              facultySubjectAssignments.facultyId,
              facultySubjectAssignments.subjectId,
              facultySubjectAssignments.divisionId
            ]
          });
      }

      // 3. Fetch Fresh Assignments to resolve IDs
      const activeAssignments = divisionIds.length > 0
        ? await tx.select({
            id: facultySubjectAssignments.id,
            facultyId: facultySubjectAssignments.facultyId,
            subjectId: facultySubjectAssignments.subjectId,
            divisionId: facultySubjectAssignments.divisionId,
          }).from(facultySubjectAssignments).where(
            inArray(facultySubjectAssignments.divisionId, divisionIds)
          )
        : [];

      const activeAssignmentMap = new Map(
        activeAssignments.map(a => [`${a.facultyId}_${a.subjectId}_${a.divisionId}`, a])
      );

      // 4. Resolve Entries
      const resolvedEntries: (typeof timetableEntries.$inferInsert)[] = [];
      const publishId = `pub_${Date.now()}`;

      // Fetch all slots from DB to map times to slotId
      const slots = await tx.select().from(timetableSlots);
      const slotMap = new Map<string, number>();
      slots.forEach((s) => {
        slotMap.set(s.startTime, s.id);
      });

      for (const p of payloads) {
        const f = facultyMap.get(p.facultyCode)!;
        const s = subjectMap.get(p.subjectCode)!;
        const c = classMap.get(p.classCode)!;

        const assignmentKey = `${f.id}_${s.id}_${c.id}`;
        const assignment = activeAssignmentMap.get(assignmentKey);

        if (!assignment) {
          throw new Error(`Critical: Assignment mapping missing for ${p.facultyCode} teaching ${p.subjectCode} in ${p.classCode} after upsert phase.`);
        }

        for (const l of p.lectures) {
          const times = slotTimes[l.slot] || { start: "00:00:00", end: "00:00:00" };
          const resolvedSlotId = slotMap.get(times.start) || null;
          
          resolvedEntries.push({
            semesterId: c.semesterId,
            divisionId: c.id,
            assignmentId: assignment.id,
            dayOfWeek: l.day.charAt(0) + l.day.slice(1).toLowerCase(), // e.g. "Monday"
            startTime: times.start,
            endTime: times.end,
            slotId: resolvedSlotId,
            isLab: !!l.lab,
            labId: l.lab || null,
            isActive: true,
            publishId: publishId,
          });
        }
      }

      // 6. Batch Insert New Timetable
      const CHUNK_SIZE = 500;
      for (let i = 0; i < resolvedEntries.length; i += CHUNK_SIZE) {
        const chunk = resolvedEntries.slice(i, i + CHUNK_SIZE);
        await tx.insert(timetableEntries).values(chunk);
      }
    });

    // Invalidate caches for all modified divisions
    await Promise.all(
      divisionIds.flatMap((divId) => [
        clearCache(cacheTags.timetable.division(divId)),
        clearCache(cacheTags.dashboard.division(divId)),
      ])
    );

    // Notify students in affected divisions
    try {
      const divisionStudents = await db
        .select({ id: students.id, currentDivisionId: students.currentDivisionId })
        .from(students)
        .where(inArray(students.currentDivisionId, divisionIds));

      for (const student of divisionStudents) {
        publishNotification({
          title: "Timetable Updated",
          message: "A new timetable has been published or updated for your division. Please check your schedule.",
          notificationType: "timetable_change",
          receiverUserId: student.id,
          receiverRole: "student",
          relatedEntityType: "divisions",
          relatedEntityId: student.currentDivisionId || undefined,
        });
      }
    } catch (notifyErr) {
      console.warn("[timetable notify] Failed to send update notifications:", notifyErr);
    }

    // Count total lectures
    const totalInserted = payloads.reduce((acc, p) => acc + p.lectures.length, 0);
    return { success: true, insertedRows: totalInserted };
  } catch (err: any) {
    return {
      success: false,
      errors: [
        {
          type: "transaction_failed",
          code: "DB_ERROR",
          message: err.message || "Database transaction failed.",
        },
      ],
    };
  }
}
