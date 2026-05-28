import { z } from "zod";
import { IdSchema } from "./common";

// ─── POST /api/admin/divisions/[id]/students/send-password-email ─────────────

export const CreateDivisionSchema = z.object({
  batchYear: z.number().min(2020, "Batch year must be between 2020 and 2099").max(2099, "Batch year must be between 2020 and 2099"),
  semesterNo: z.number().min(1, "Semester must be between 1 and 6").max(6, "Semester must be between 1 and 6"),
  specialization: z.enum(["AI", "DS", "REGULAR"], {
    message: "Specialization must be AI, DS, or REGULAR",
  }),
  courseId: z.coerce.number().optional(),
});

export const SendPasswordEmailSchema = z.object({
  studentDbId: IdSchema.or(z.string().regex(/^\d+$/).transform(Number)),
});

export type CreateDivisionInput = z.infer<typeof CreateDivisionSchema>;
export type SendPasswordEmailInput = z.input<typeof SendPasswordEmailSchema>;
export type SendPasswordEmailParsed = z.infer<typeof SendPasswordEmailSchema>;
