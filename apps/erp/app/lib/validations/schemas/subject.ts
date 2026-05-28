import { z } from "zod";
import { SubjectTypeSchema } from "./common";

const SUBJECT_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/;

// Reusable numeric transform to handle form strings natively
const FormNumberSchema = z.union([z.string(), z.number()])
  .pipe(z.number().int().min(0, "Must be a non-negative whole number"));

export const SubjectSchema = z.object({
  code: z.string().trim()
    .min(1, "Subject Code is required")
    .regex(SUBJECT_CODE_REGEX, "Subject code may only contain letters, digits, and dashes (max 20 chars)"),
  name: z.string().trim()
    .min(1, "Subject Name is required")
    .max(100, "Subject name must be 100 characters or less"),
  subjectType: SubjectTypeSchema,
  internalTheoryMax: FormNumberSchema,
  externalTheoryMax: FormNumberSchema,
  theoryPassingMarks: FormNumberSchema,
  internalPracticalMax: FormNumberSchema,
  externalPracticalMax: FormNumberSchema,
  practicalPassingMarks: FormNumberSchema,
}).superRefine((data, ctx) => {
  const isTheory = data.subjectType === "theory" || data.subjectType === "both";
  const isPractical = data.subjectType === "practical" || data.subjectType === "both";

  if (isTheory) {
    const totalTheory = data.internalTheoryMax + data.externalTheoryMax;
    if (totalTheory <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total theory marks must be greater than 0", path: ["internalTheoryMax"] });
    }
    if (data.theoryPassingMarks > totalTheory) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Passing marks (${data.theoryPassingMarks}) cannot exceed total theory marks (${totalTheory})`, path: ["theoryPassingMarks"] });
    }
  }

  if (isPractical) {
    const totalPractical = data.internalPracticalMax + data.externalPracticalMax;
    if (totalPractical <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total practical marks must be greater than 0", path: ["internalPracticalMax"] });
    }
    if (data.practicalPassingMarks > totalPractical) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Passing marks (${data.practicalPassingMarks}) cannot exceed total practical marks (${totalPractical})`, path: ["practicalPassingMarks"] });
    }
  }
});

export type SubjectInput = z.input<typeof SubjectSchema>;
export type SubjectParsedData = z.infer<typeof SubjectSchema>;

export const INITIAL_SUBJECT_FORM: SubjectInput = {
  code: "",
  name: "",
  subjectType: "theory", // default from enum
  internalTheoryMax: "",
  externalTheoryMax: "",
  theoryPassingMarks: "",
  internalPracticalMax: "",
  externalPracticalMax: "",
  practicalPassingMarks: "",
};
