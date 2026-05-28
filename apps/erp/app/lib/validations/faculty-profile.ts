import { z } from "zod";
import { GenderSchema, PhoneSchema, PincodeSchema } from "./schemas/common";

export const GENDERS = GenderSchema.options as readonly string[];
export const FACULTY_ADDRESS_KINDS = ["home", "other"] as const;

export const FacultyPersonalInfoSchema = z.object({
  fullName: z.string().trim().min(1, "Full Name is required"),
  dob: z.string().refine((v) => !isNaN(new Date(v).getTime()), { message: "Invalid date" }),
  gender: GenderSchema,
});
export type FacultyPersonalInfoData = z.infer<typeof FacultyPersonalInfoSchema>;

export const FacultyAddressSchema = z.object({
  line1: z.string().trim().min(1, "Address Line 1 is required"),
  city: z.string().trim().min(1, "City is required"),
  pincode: PincodeSchema,
  kind: z.enum(["home", "other"]),
});
export type FacultyAddressData = z.infer<typeof FacultyAddressSchema>;

export const FacultyContactInfoSchema = z.object({
  mobile: PhoneSchema,
  alternateMobile: z.string().regex(/^\d{10}$/, "Alternate mobile must be 10 digits").optional(),
  address: FacultyAddressSchema.optional(),
});
export type FacultyContactInfoData = z.infer<typeof FacultyContactInfoSchema>;

export const FacultyProfessionalInfoSchema = z.object({
  qualification: z.string().trim().min(1, "Qualification is required"),
  experienceYears: z.union([z.string(), z.number()]).refine((v) => {
    const years = Number(v);
    return !Number.isNaN(years) && years >= 0 && years <= 60;
  }, { message: "Experience must be between 0 and 60 years" }),
  specialization: z.string().trim().min(1, "Specialization is required"),
  designation: z.string().trim().min(1, "Designation is required"),
});
export type FacultyProfessionalInfoData = z.infer<typeof FacultyProfessionalInfoSchema>;

export const FacultyDocumentsSchema = z.object({
  profilePhotoUrl: z.string().min(1, "Profile photo is required").optional(), // Kept optional in type but superRefined below
});
export type FacultyDocumentsData = z.infer<typeof FacultyDocumentsSchema>;

const FacultyDocumentsValidationSchema = FacultyDocumentsSchema.superRefine((data, ctx) => {
  if (!data.profilePhotoUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Profile photo is required", path: ["profilePhotoUrl"] });
  }
});

// Legacy wrapper functions for frontend compatibility
export interface ValidationError {
  field: string;
  message: string;
}
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
function toValidationResult(result: any): ValidationResult {
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map((i: any) => ({ field: i.path.join("."), message: i.message })),
  };
}

export function validateFacultyStep1(data: FacultyPersonalInfoData) { return toValidationResult(FacultyPersonalInfoSchema.safeParse(data)); }
export function validateFacultyStep2(data: FacultyContactInfoData) { return toValidationResult(FacultyContactInfoSchema.safeParse(data)); }
export function validateFacultyStep3(data: FacultyProfessionalInfoData) { return toValidationResult(FacultyProfessionalInfoSchema.safeParse(data)); }
export function validateFacultyStep4(data: FacultyDocumentsData) { return toValidationResult(FacultyDocumentsValidationSchema.safeParse(data)); }
