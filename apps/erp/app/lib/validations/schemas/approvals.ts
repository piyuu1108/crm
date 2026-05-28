import { z } from "zod";
import { DateStringSchema, IdSchema, OptionalIdSchema } from "./common";

// ─── Document Payload ────────────────────────────────────────────────────────
export const DocumentSchema = z.object({
  fileName: z.string().trim().min(1, "Document name is required"),
  fileUrl: z.string().trim().url("Invalid document URL"),
  fileSize: z.number().int().positive().optional(),
});

// ─── Proxy Payload ───────────────────────────────────────────────────────────
export const ProxySchema = z.object({
  originalDate: DateStringSchema,
  proxyFacultyId: IdSchema,
  slotName: z.string().trim().optional(),
});

// ─── Submit Request Payload ──────────────────────────────────────────────────
export const SubmitApprovalSchema = z.object({
  requestTypeCode: z.string().trim().min(1, "Request type code is required"),
  fromDate: DateStringSchema,
  toDate: DateStringSchema,
  description: z.string().trim().min(1, "Description is required"),
  document: DocumentSchema.optional(),
  proxies: z.array(ProxySchema).default([]),
});

export type SubmitApprovalInput = z.input<typeof SubmitApprovalSchema>;
export type SubmitApprovalParsed = z.infer<typeof SubmitApprovalSchema>;

// ─── Action Request Payload ──────────────────────────────────────────────────
export const ApprovalActionSchema = z.object({
  requestId: IdSchema,
  action: z.enum(["approve", "reject"]),
  remarks: z.string().trim().optional(),
  proxyOverrides: z.array(z.object({
    proxyId: IdSchema,
    action: z.enum(["approve", "reject"]),
    newProxyFacultyId: IdSchema.optional(),
  })).default([]),
});

export type ApprovalActionInput = z.input<typeof ApprovalActionSchema>;
export type ApprovalActionParsed = z.infer<typeof ApprovalActionSchema>;
