import { z } from "zod";

export const LectureSlotSchema = z.object({
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  slot: z.number().int().min(1).max(10),
  lab: z.string().optional(),
});

export const SimplifiedPayloadSchema = z.object({
  classCode: z.string().min(1),
  facultyCode: z.string().min(1),
  subjectCode: z.string().min(1),
  lectures: z.array(LectureSlotSchema).min(1),
});

export type SimplifiedPayload = z.infer<typeof SimplifiedPayloadSchema>;

export interface ValidationError {
  type: string;
  code: string;
  message: string;
}
