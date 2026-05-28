import { z } from "zod";
import { IdSchema } from "./common";

// ─── POST /api/admin/divisions/[id]/students/send-password-email ─────────────

export const SendPasswordEmailSchema = z.object({
  studentDbId: IdSchema.or(z.string().regex(/^\d+$/).transform(Number)),
});

export type SendPasswordEmailInput = z.input<typeof SendPasswordEmailSchema>;
export type SendPasswordEmailParsed = z.infer<typeof SendPasswordEmailSchema>;
