import { z } from "zod";
import { IdSchema, NonEmptyString, DateStringSchema, TimeStringSchema } from "./common";

// ─── Exam Type Enum ───────────────────────────────────────────────────────────

export const ExamTypeSchema = z.enum(["internal", "mid", "unit"]);
export const ExamStatusSchema = z.enum(["draft", "scheduled", "seating_pending", "active", "completed"]);

// ─── Step 1: Basic Details ────────────────────────────────────────────────────

export const ExamWizardStep1Schema = z.object({
  examName: NonEmptyString.max(100),
  examNumber: z.number().int().min(1),
  description: z.string().max(500).optional().or(z.literal("")),
  examType: ExamTypeSchema.default("internal"),
  academicYearId: IdSchema.optional(),
});

export type ExamWizardStep1Input = z.infer<typeof ExamWizardStep1Schema>;

// ─── Step 2: Target Scope ─────────────────────────────────────────────────────

export const ExamWizardStep2Schema = z.object({
  divisionIds: z.array(IdSchema).min(1, "Select at least one division"),
});

export type ExamWizardStep2Input = z.infer<typeof ExamWizardStep2Schema>;

// ─── Step 3: Eligibility Rules ────────────────────────────────────────────────

const EligibilityRuleSchema = z.object({
  yearLabel: z.number().int().min(1).max(6),
  minAttendancePercent: z.number().int().min(0).max(100).default(75),
  allowApprovalOverride: z.boolean().default(false),
  approvalDeadline: DateStringSchema.optional().or(z.literal("")),
});

export const ExamWizardStep3Schema = z.object({
  rules: z.array(EligibilityRuleSchema).min(1, "At least one rule is required"),
});

export type ExamWizardStep3Input = z.infer<typeof ExamWizardStep3Schema>;

// ─── Step 4: Subject Selection ────────────────────────────────────────────────

const ExamSubjectItemSchema = z.object({
  subjectId: IdSchema,
  durationMinutes: z.number().int().min(15).max(360).default(60),
});

export const ExamWizardStep4Schema = z.object({
  subjects: z.array(ExamSubjectItemSchema).min(1, "Select at least one subject"),
});

export type ExamWizardStep4Input = z.infer<typeof ExamWizardStep4Schema>;

// ─── Step 5: Schedule Planning ────────────────────────────────────────────────

const ScheduleSlotSchema = z.object({
  examSubjectId: IdSchema,
  examDate: DateStringSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
});

export const ExamWizardStep5Schema = z.object({
  slots: z.array(ScheduleSlotSchema).min(1, "Schedule at least one subject"),
});

export type ExamWizardStep5Input = z.infer<typeof ExamWizardStep5Schema>;

// ─── Step 6: Hall Allocation ──────────────────────────────────────────────────

const HallAllocationItemSchema = z.object({
  classroomId: IdSchema,
  sequenceOrder: z.number().int().min(1),
});

export const ExamWizardStep6Schema = z.object({
  allocations: z.array(HallAllocationItemSchema).min(1, "Select at least one classroom"),
});

export type ExamWizardStep6Input = z.infer<typeof ExamWizardStep6Schema>;

// ─── Create Draft (initial POST) ──────────────────────────────────────────────

export const CreateExamDraftSchema = ExamWizardStep1Schema.extend({
  semesterId: IdSchema.optional(),
});

export type CreateExamDraftInput = z.infer<typeof CreateExamDraftSchema>;

// ─── Publish Exam ─────────────────────────────────────────────────────────────

export const PublishExamSchema = z.object({
  examId: IdSchema,
});
