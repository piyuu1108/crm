import { z } from "zod";

// ─── Atomic ID Schemas ────────────────────────────────────────────────────────

export const IdSchema = z.number().int().positive();
export const OptionalIdSchema = z.number().int().positive().optional();

// ─── String Primitives ────────────────────────────────────────────────────────

/** Non-empty trimmed string. Use for required text fields. */
export const NonEmptyString = z.string().trim().min(1);

/** Trimmed string capped at a given max length. */
export const BoundedString = (max: number) => z.string().trim().min(1).max(max);

// ─── Indian-Specific Formats ──────────────────────────────────────────────────

export const PhoneSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{10}$/, "Must be a 10-digit number"));

export const OptionalPhoneSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{10}$/, "Must be a 10-digit number"))
  .optional()
  .or(z.literal(""));

export const PincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Must be exactly 6 digits");

export const AadhaarSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{12}$/, "Must be 12 digits"));

// ─── Date / Time ──────────────────────────────────────────────────────────────

/** ISO date string (YYYY-MM-DD) or any parseable date string. */
export const DateStringSchema = z.string().refine(
  (v) => !isNaN(new Date(v).getTime()),
  { message: "Invalid date" }
);

/** Time string HH:MM or HH:MM:SS. */
export const TimeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS");

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Domain Enums ─────────────────────────────────────────────────────────────

export const GenderSchema = z.enum(["male", "female", "other"]);
export const BloodGroupSchema = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
export const CategorySchema = z.enum(["SC", "ST", "OBC", "Open"]);
export const BoardSchema = z.enum(["GSEB", "CBSE", "ICSE", "IB", "STATE", "OTHER"]);

export const RequestStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const AttendanceStatusSchema = z.enum(["present", "absent"]);
export const TargetTypeSchema = z.enum(["ALL", "FACULTY", "YEAR", "DIVISION"]);
export const SubjectTypeSchema = z.enum(["theory", "practical", "both", "project_minor", "project_major"]);

export const DayOfWeekSchema = z.enum([
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
]);

// ─── Marks ────────────────────────────────────────────────────────────────────

/** Non-negative integer for marks fields (internal/external/passing). */
export const MarksSchema = z.coerce.number().int().min(0);
export const OptionalMarksSchema = z.coerce.number().int().min(0).nullable().optional();

/** Decimal marks (from input or DB). */
export const DecimalMarksSchema = z.coerce.number().min(0).nullable().optional();
