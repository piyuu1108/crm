import { z } from "zod";
import { IdSchema, AttendanceStatusSchema } from "./common";

// ─── POST /api/attendance/save ────────────────────────────────────────────────

const AttendanceRecordSchema = z.object({
  studentId: IdSchema,
  status: AttendanceStatusSchema,
});

export const SaveAttendanceSchema = z.object({
  sessionId: IdSchema,
  records: z.array(AttendanceRecordSchema).min(1, "At least one record is required"),
});

export type SaveAttendanceInput = z.infer<typeof SaveAttendanceSchema>;
