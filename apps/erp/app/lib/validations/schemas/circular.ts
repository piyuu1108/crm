import { z } from "zod";
import { IdSchema, NonEmptyString, BoundedString, TargetTypeSchema } from "./common";

// ─── POST /api/faculty/circulars ──────────────────────────────────────────────

export const CreateCircularSchema = z
  .object({
    title: BoundedString(255),
    description: z.string().optional().or(z.null()),
    attachmentUrl: z.string().optional().or(z.null()),
    attachmentType: z.string().optional().or(z.null()),
    attachmentSize: z.number().int().positive().optional().or(z.null()),
    targetType: TargetTypeSchema,
    targetYear: z.number().int().min(1).max(6).optional().or(z.null()),
    targetDivisionIds: z.array(IdSchema).optional(),
  })
  .refine(
    (d) => d.targetType !== "YEAR" || (d.targetYear != null && d.targetYear >= 1 && d.targetYear <= 6),
    { message: "Target year must be between 1 and 6", path: ["targetYear"] }
  )
  .refine(
    (d) =>
      d.targetType !== "DIVISION" ||
      (Array.isArray(d.targetDivisionIds) && d.targetDivisionIds.length > 0),
    { message: "At least one division must be selected", path: ["targetDivisionIds"] }
  );

export type CreateCircularInput = z.infer<typeof CreateCircularSchema>;
