import { db } from "@/app/lib/db";
import { attendanceSessionLedger } from "@/app/lib/schema";
import { sql, and, eq } from "drizzle-orm";

export interface SubmitAttendanceCQRSInput {
  semesterId: number;
  divisionId: number;
  facultyId: number;
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:MM:SS
  endTime: string;      // HH:MM:SS
  subjectId: number;
  absentStudentIds: number[];
}

/**
 * High-performance CQRS-style attendance submission.
 * Wraps ledger insertion/update and analytics summary update in a single transaction.
 */
export async function submitAttendanceCQRS(payload: SubmitAttendanceCQRSInput): Promise<number> {
  return await db.transaction(async (tx) => {
    // Check if there is an existing ledger entry for this division + semester + date + slot
    const [existing] = await tx
      .select({
        id: attendanceSessionLedger.id,
        absentStudentIds: attendanceSessionLedger.absentStudentIds,
      })
      .from(attendanceSessionLedger)
      .where(
        and(
          eq(attendanceSessionLedger.divisionId, payload.divisionId),
          eq(attendanceSessionLedger.semesterId, payload.semesterId),
          eq(attendanceSessionLedger.date, payload.date),
          eq(attendanceSessionLedger.startTime, payload.startTime),
          eq(attendanceSessionLedger.endTime, payload.endTime)
        )
      )
      .limit(1);

    if (existing) {
      // 1. Update the existing ledger entry
      await tx
        .update(attendanceSessionLedger)
        .set({
          absentStudentIds: payload.absentStudentIds,
          facultyId: payload.facultyId,
          subjectId: payload.subjectId,
        })
        .where(eq(attendanceSessionLedger.id, existing.id));

      const oldAbsentIdsParam = `{${existing.absentStudentIds.join(",")}}`;
      const newAbsentIdsParam = `{${payload.absentStudentIds.join(",")}}`;

      // 2. Perform a raw SQL upsert with the edit logic (diffing counts without incrementing total_lectures)
      await tx.execute(sql`
        INSERT INTO attendance_analytics_summary (student_id, division_id, semester_id, present_count, total_lectures, attendance_percentage, updated_at)
        SELECT 
          id as student_id,
          ${payload.divisionId} as division_id,
          ${payload.semesterId} as semester_id,
          (CASE WHEN id = ANY(${newAbsentIdsParam}::integer[]) THEN 0 ELSE 1 END) as present_count,
          1 as total_lectures,
          (CASE WHEN id = ANY(${newAbsentIdsParam}::integer[]) THEN 0.00 ELSE 100.00 END) as attendance_percentage,
          NOW() as updated_at
        FROM students
        WHERE current_division_id = ${payload.divisionId}
        ON CONFLICT (student_id, division_id, semester_id)
        DO UPDATE SET
          present_count = attendance_analytics_summary.present_count + 
            CASE 
              WHEN (EXCLUDED.student_id = ANY(${oldAbsentIdsParam}::integer[])) AND NOT (EXCLUDED.student_id = ANY(${newAbsentIdsParam}::integer[])) THEN 1
              WHEN NOT (EXCLUDED.student_id = ANY(${oldAbsentIdsParam}::integer[])) AND (EXCLUDED.student_id = ANY(${newAbsentIdsParam}::integer[])) THEN -1
              ELSE 0
            END,
          total_lectures = attendance_analytics_summary.total_lectures,
          attendance_percentage = ROUND(
            (
              (attendance_analytics_summary.present_count + 
                CASE 
                  WHEN (EXCLUDED.student_id = ANY(${oldAbsentIdsParam}::integer[])) AND NOT (EXCLUDED.student_id = ANY(${newAbsentIdsParam}::integer[])) THEN 1
                  WHEN NOT (EXCLUDED.student_id = ANY(${oldAbsentIdsParam}::integer[])) AND (EXCLUDED.student_id = ANY(${newAbsentIdsParam}::integer[])) THEN -1
                  ELSE 0
                END)::numeric / 
              NULLIF(attendance_analytics_summary.total_lectures, 0)::numeric
            ) * 100, 
            2
          ),
          updated_at = NOW();
      `);

      return existing.id;
    } else {
      // 1. Insert new session record into the ledger and retrieve the generated ID
      const [inserted] = await tx
        .insert(attendanceSessionLedger)
        .values({
          semesterId: payload.semesterId,
          divisionId: payload.divisionId,
          facultyId: payload.facultyId,
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          subjectId: payload.subjectId,
          absentStudentIds: payload.absentStudentIds,
        })
        .returning({ id: attendanceSessionLedger.id });

      const absentIdsParam = `{${payload.absentStudentIds.join(",")}}`;

      // 2. Perform a raw SQL upsert into attendance_analytics_summary (new session)
      await tx.execute(sql`
        INSERT INTO attendance_analytics_summary (student_id, division_id, semester_id, present_count, total_lectures, attendance_percentage, updated_at)
        SELECT 
          id as student_id,
          ${payload.divisionId} as division_id,
          ${payload.semesterId} as semester_id,
          (CASE WHEN id = ANY(${absentIdsParam}::integer[]) THEN 0 ELSE 1 END) as present_count,
          1 as total_lectures,
          (CASE WHEN id = ANY(${absentIdsParam}::integer[]) THEN 0.00 ELSE 100.00 END) as attendance_percentage,
          NOW() as updated_at
        FROM students
        WHERE current_division_id = ${payload.divisionId}
        ON CONFLICT (student_id, division_id, semester_id)
        DO UPDATE SET
          present_count = attendance_analytics_summary.present_count + (CASE WHEN EXCLUDED.student_id = ANY(${absentIdsParam}::integer[]) THEN 0 ELSE 1 END),
          total_lectures = attendance_analytics_summary.total_lectures + 1,
          attendance_percentage = ROUND(
            (
              (attendance_analytics_summary.present_count + (CASE WHEN EXCLUDED.student_id = ANY(${absentIdsParam}::integer[]) THEN 0 ELSE 1 END))::numeric / 
              (attendance_analytics_summary.total_lectures + 1)::numeric
            ) * 100, 
            2
          ),
          updated_at = NOW();
      `);

      return inserted.id;
    }
  });
}
