import { z } from "zod";
import { IdSchema, NonEmptyString } from "./common";

// ─── POST /api/requests ───────────────────────────────────────────────────────

export const CreateStudentRequestSchema = z.object({
  subject: NonEmptyString,
  description: NonEmptyString,
  targetFacultyId: IdSchema,
  requestType: z.string().trim().min(1).default("general"),
  attachmentUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  attachmentType: z.string().optional().or(z.null()),
  attachmentSize: z.number().int().positive().optional().or(z.null()),
});

export type CreateStudentRequestInput = z.infer<typeof CreateStudentRequestSchema>;

// ─── PATCH /api/requests/[id] ─────────────────────────────────────────────────

export const ReviewStudentRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  remarks: z.string().trim().optional(),
});

export type ReviewStudentRequestInput = z.input<typeof ReviewStudentRequestSchema>;
export type ReviewStudentRequestParsed = z.infer<typeof ReviewStudentRequestSchema>;

// ─── GET /api/requests ────────────────────────────────────────────────────────

import { PaginationSchema } from "./common";

export const GetRequestsQuerySchema = PaginationSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});
