import { eq, inArray, and, sql } from "drizzle-orm";
import { db } from "@/app/lib/db";
import {
  faculty,
  subjects,
  divisions,
  facultySubjectAssignments,
  timetableEntries,
  rooms,
} from "@/app/lib/schema";
import { SimplifiedPayload, ValidationError } from "./timetable-validator";

export async function processTimetablePublish(payloads: SimplifiedPayload[]) {
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
    1: { start: "07:50:00", end: "08:40:00" },
    2: { start: "08:40:00", end: "09:30:00" },
    3: { start: "09:40:00", end: "10:30:00" },
    4: { start: "10:30:00", end: "11:20:00" },
    5: { start: "11:20:00", end: "12:30:00" },
  };

  try {
    await db.transaction(async (tx) => {
      // 1. Upsert Rooms
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
          
          resolvedEntries.push({
            semesterId: c.semesterId,
            divisionId: c.id,
            assignmentId: assignment.id,
            dayOfWeek: l.day.charAt(0) + l.day.slice(1).toLowerCase(), // e.g. "Monday"
            startTime: times.start,
            endTime: times.end,
            isLab: !!l.lab,
            labId: l.lab || null,
            isActive: true,
            publishId: publishId,
          });
        }
      }

      // 5. Logical Deletion of Old Timetable for these divisions
      if (divisionIds.length > 0) {
        await tx.update(timetableEntries)
          .set({ isActive: false })
          .where(inArray(timetableEntries.divisionId, divisionIds));
      }

      // 6. Batch Insert New Timetable
      const CHUNK_SIZE = 500;
      for (let i = 0; i < resolvedEntries.length; i += CHUNK_SIZE) {
        const chunk = resolvedEntries.slice(i, i + CHUNK_SIZE);
        await tx.insert(timetableEntries).values(chunk);
      }
    });

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
