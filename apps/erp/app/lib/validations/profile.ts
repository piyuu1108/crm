import { z } from "zod";
import { GenderSchema, BloodGroupSchema, CategorySchema, BoardSchema, AadhaarSchema, PhoneSchema, OptionalPhoneSchema, PincodeSchema } from "./schemas/common";

// ─── Constants ──────────────────────────────────────────────────────────────
export const GENDERS = GenderSchema.options as readonly string[];
export const BLOOD_GROUPS = BloodGroupSchema.options as readonly string[];
export const CATEGORIES = CategorySchema.options as readonly string[];
export const BOARDS = BoardSchema.options as readonly string[];
export const ADDRESS_KINDS = ["home", "hostel", "pg", "relative"] as const;
export type AddressKind = typeof ADDRESS_KINDS[number];
const HOSTEL_KINDS = ["hostel", "pg"] as const;

// ─── Step 1: Personal Info ──────────────────────────────────────────────────
export const PersonalInfoSchema = z.object({
  fullName: z.string().trim().min(1, "Full Name is required").max(150, "Full Name must be at most 150 characters"),
  dob: z.string().refine((v) => !isNaN(new Date(v).getTime()), { message: "Date of Birth is invalid" }),
  gender: GenderSchema,
  bloodGroup: BloodGroupSchema.optional(),
});
export type PersonalInfoData = z.infer<typeof PersonalInfoSchema>;

// ─── Step 2: Contact Info ───────────────────────────────────────────────────
export const AddressKindSchema = z.enum(ADDRESS_KINDS);

export const CurrentAddressSchema = z.object({
  line1: z.string().trim().min(1, "Address Line 1 is required").max(200, "Address Line 1 must be at most 200 characters"),
  city: z.string().trim().min(1, "City is required").max(100, "City must be at most 100 characters"),
  pincode: PincodeSchema.or(z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits")),
  kind: AddressKindSchema,
});
export type CurrentAddressData = z.infer<typeof CurrentAddressSchema>;

export const HomeAddressSchema = z.object({
  line1: z.string().trim().min(1, "Home Address Line 1 is required").max(200, "Home Address Line 1 must be at most 200 characters"),
  city: z.string().trim().min(1, "Home City is required"),
  pincode: z.string().regex(/^\d{6}$/, "Home Pincode must be exactly 6 digits"),
});
export type HomeAddressData = z.infer<typeof HomeAddressSchema>;

export const StudentAddressSchema = z.object({
  current: CurrentAddressSchema,
  home: HomeAddressSchema.optional(),
});
export type StudentAddressData = z.infer<typeof StudentAddressSchema>;

export const ContactInfoSchema = z.object({
  mobile: PhoneSchema.or(z.string().regex(/^\d{10}$/, "Mobile must be a 10-digit number")),
  parentMobile: z.string().regex(/^\d{10}$/, "Parent Mobile must be a 10-digit number").optional(),
  optionalMobile: z.string().regex(/^\d{10}$/, "Optional Mobile must be a 10-digit number").optional(),
  address: StudentAddressSchema,
  aadhaarStudent: z.string().regex(/^\d{12}$/, "Student Aadhaar must be 12 digits").optional(),
  aadhaarParent: z.string().regex(/^\d{12}$/, "Parent Aadhaar must be 12 digits").optional(),
}).superRefine((data, ctx) => {
  const current = data.address?.current;
  if (!current) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Current address is required", path: ["address", "current", "line1"] });
    return;
  }
  if (HOSTEL_KINDS.includes(current.kind as any)) {
    const home = data.address.home;
    if (!home) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Home address is required for hostel/PG residents", path: ["address", "home", "line1"] });
    }
  }
});
export type ContactInfoData = z.infer<typeof ContactInfoSchema>;

// ─── Step 3: Academic Info ──────────────────────────────────────────────────
export const AcademicInfoSchema = z.object({
  category: CategorySchema,
  board: BoardSchema,
  twelfthPercent: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0 && n <= 100;
  }, { message: "12th Percentage must be between 0 and 100" }),
  twelfthStream: z.string().trim().min(1, "12th Stream is required"),
  schoolName: z.string().trim().min(1, "School Name is required"),
  udiseCode: z.string().optional(),
});
export type AcademicInfoData = z.infer<typeof AcademicInfoSchema>;

// ─── Step 4: Documents Info ─────────────────────────────────────────────────
export const DocumentsSchema = z.object({
  profilePhoto: z.string().min(1, "Profile Photo is required").optional(), // We allow optional in schema, superRefine checks based on rules
  lcCertificate: z.string().min(1, "LC (Leaving Certificate) is required").optional(),
  marksheet10th: z.string().min(1, "10th Marksheet is required").optional(),
  marksheet12th: z.string().min(1, "12th Marksheet is required").optional(),
  casteCertificate: z.string().optional(),
  migrationCertificate: z.string().optional(),
});
export type DocumentsData = z.infer<typeof DocumentsSchema>;

export const DocumentsValidationSchema = DocumentsSchema.superRefine((data, ctx) => {
  if (!data.profilePhoto) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Profile Photo is required", path: ["profilePhoto"] });
  if (!data.lcCertificate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "LC (Leaving Certificate) is required", path: ["lcCertificate"] });
  if (!data.marksheet10th) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "10th Marksheet is required", path: ["marksheet10th"] });
  if (!data.marksheet12th) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "12th Marksheet is required", path: ["marksheet12th"] });
});

export const StudentProfileSchema = z.object({
  step1: PersonalInfoSchema,
  step2: ContactInfoSchema,
  step3: AcademicInfoSchema,
  step4: DocumentsSchema,
}).superRefine((data, ctx) => {
  if (!data.step4.profilePhoto) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Profile Photo is required", path: ["step4", "profilePhoto"] });
  if (!data.step4.lcCertificate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "LC (Leaving Certificate) is required", path: ["step4", "lcCertificate"] });
  if (!data.step4.marksheet10th) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "10th Marksheet is required", path: ["step4", "marksheet10th"] });
  if (!data.step4.marksheet12th) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "12th Marksheet is required", path: ["step4", "marksheet12th"] });
  if (data.step3.category !== "Open" && !data.step4.casteCertificate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Caste Certificate is required for your category", path: ["step4", "casteCertificate"] });
  }
  if (data.step3.board !== "GSEB" && !data.step4.migrationCertificate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Migration Certificate is required for non-GSEB board", path: ["step4", "migrationCertificate"] });
  }
});
