import { z } from "zod";
import { DayOfWeekSchema, IdSchema, TimeStringSchema } from "./common";

// ─── Timetable Entry Payload ─────────────────────────────────────────────────
export const TimetableEntrySchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  assignmentId: IdSchema,
  color: z.string().trim().optional(),
  isLab: z.boolean().optional(),
  labId: z.string().trim().nullable().optional(),
});

// ─── Bulk Save Timetable Payload ─────────────────────────────────────────────
export const SaveTimetableSchema = z.object({
  divisionId: IdSchema.or(z.string().regex(/^\d+$/).transform(Number)),
  entries: z.array(TimetableEntrySchema),
});

export type SaveTimetableInput = z.input<typeof SaveTimetableSchema>;
export type SaveTimetableParsed = z.infer<typeof SaveTimetableSchema>;
