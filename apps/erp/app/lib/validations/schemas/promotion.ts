import { z } from "zod";
import { IdSchema } from "./common";

// ─── Promotion Payload ───────────────────────────────────────────────────────
export const PromotionSchema = z.object({
  sourceDivisionId: IdSchema.or(z.string().regex(/^\d+$/).transform(Number)),
  targetDivisionId: IdSchema.or(z.string().regex(/^\d+$/).transform(Number)),
  studentIds: z.array(IdSchema.or(z.string().regex(/^\d+$/).transform(Number))).optional(),
}).superRefine((data, ctx) => {
  if (data.sourceDivisionId === data.targetDivisionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Source and target divisions must be different", path: ["targetDivisionId"] });
  }
});

export type PromotionInput = z.input<typeof PromotionSchema>;
export type PromotionParsed = z.infer<typeof PromotionSchema>;
