import { z } from "zod";
import { IdSchema, NonEmptyString, TargetTypeSchema, DecimalMarksSchema } from "./common";

// ─── POST /api/internal-exams ─────────────────────────────────────────────────

export const CreateInternalExamSchema = z
  .object({
    examName: NonEmptyString,
    examNumber: z.number().int().min(1),
    targetType: TargetTypeSchema.default("ALL"),
    targetYear: z.number().int().min(1).max(6).optional(),
    targetDivisionId: IdSchema.optional(),
    semesterId: IdSchema.optional(),
  })
  .refine(
    (d) => d.targetType !== "YEAR" || d.targetYear !== undefined,
    { message: "targetYear is required when targetType is YEAR", path: ["targetYear"] }
  )
  .refine(
    (d) => d.targetType !== "DIVISION" || d.targetDivisionId !== undefined,
    { message: "targetDivisionId is required when targetType is DIVISION", path: ["targetDivisionId"] }
  );

export type CreateInternalExamInput = z.infer<typeof CreateInternalExamSchema>;

// ─── POST /api/internal-exams/marks ───────────────────────────────────────────

const ExamMarkRecordSchema = z.object({
  studentId: IdSchema,
  theoryMarks: DecimalMarksSchema,
  practicalMarks: DecimalMarksSchema,
});

export const SaveExamMarksSchema = z.object({
  examId: IdSchema,
  assignmentId: IdSchema,
  isDraft: z.boolean().default(true),
  records: z.array(ExamMarkRecordSchema).min(1, "At least one record is required"),
});

export type SaveExamMarksInput = z.infer<typeof SaveExamMarksSchema>;

// ─── POST /api/internal-evaluation ────────────────────────────────────────────

const EvaluationRecordSchema = z.object({
  studentId: IdSchema,
  finalTheoryMarks: DecimalMarksSchema,
  finalPracticalMarks: DecimalMarksSchema,
});

export const SaveEvaluationSchema = z.object({
  assignmentId: IdSchema,
  semesterId: IdSchema,
  records: z.array(EvaluationRecordSchema).min(1, "At least one record is required"),
});

export type SaveEvaluationInput = z.infer<typeof SaveEvaluationSchema>;

// ─── PUT /api/internal-exams/marks/visibility ─────────────────────────────────

export const ExamMarksVisibilitySchema = z.object({
  examId: IdSchema,
  assignmentId: IdSchema,
  isVisible: z.boolean(),
});

export type ExamMarksVisibilityInput = z.infer<typeof ExamMarksVisibilitySchema>;

// ─── PUT /api/internal-evaluation/finalize ────────────────────────────────────

export const EvaluationFinalizeSchema = z.object({
  assignmentId: IdSchema,
  semesterId: IdSchema,
  finalize: z.boolean(),
});

export type EvaluationFinalizeInput = z.infer<typeof EvaluationFinalizeSchema>;
