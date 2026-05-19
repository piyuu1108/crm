import { db } from "@/app/lib/db";
import { attendanceSessionLedger } from "@/app/lib/schema";
import { sql } from "drizzle-orm";

export interface SubmitAttendanceCQRSInput {
  semesterId: number;
  divisionId: number;
  facultyId: number;
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:MM:SS
  endTime: string;      // HH:MM:SS
  subjectName: string;
  absentStudentIds: number[];
}

/**
 * High-performance CQRS-style attendance submission.
 * Wraps ledger insertion and analytics summary update in a single transaction.
 */
export async function submitAttendanceCQRS(payload: SubmitAttendanceCQRSInput): Promise<number> {
  return await db.transaction(async (tx) => {
    // 1. Insert the session record into the ledger and retrieve the generated ID
    const [inserted] = await tx
      .insert(attendanceSessionLedger)
      .values({
        semesterId: payload.semesterId,
        divisionId: payload.divisionId,
        facultyId: payload.facultyId,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        subjectName: payload.subjectName,
        absentStudentIds: payload.absentStudentIds,
      })
      .returning({ id: attendanceSessionLedger.id });

    const absentIdsParam = `{${payload.absentStudentIds.join(",")}}`;

    // 2. Perform a raw SQL upsert into attendance_analytics_summary
    // All math and conditional logic happens natively inside the SQL engine
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
  });
}
