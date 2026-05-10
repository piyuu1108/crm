/**
 * Student Profile step-wise validation (no external deps).
 *
 * Each step has a validate function that returns { valid, errors }.
 * Used on both client and server for consistency.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function required(value: unknown, field: string, label: string): ValidationError | null {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return { field, message: `${label} is required` };
  }
  return null;
}

function maxLen(value: string | undefined | null, field: string, label: string, max: number): ValidationError | null {
  if (value && value.length > max) {
    return { field, message: `${label} must be at most ${max} characters` };
  }
  return null;
}

function isValidDate(value: string | undefined | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

function isValidPhone(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^\d{10}$/.test(value.replace(/\s+/g, ""));
}

function isValidAadhaar(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^\d{12}$/.test(value.replace(/\s+/g, ""));
}

function isValidPercent(value: unknown): boolean {
  const n = Number(value);
  return !isNaN(n) && n >= 0 && n <= 100;
}

// ─── Step Types ─────────────────────────────────────────────────────────────

export interface PersonalInfoData {
  fullName: string;
  dob: string;
  gender: string;
  bloodGroup?: string;
}

export interface ContactInfoData {
  mobile: string;
  parentMobile?: string;
  optionalMobile?: string;
  address: string;
  aadhaarStudent?: string;
  aadhaarParent?: string;
}

export interface AcademicInfoData {
  category: string;
  board: string;
  twelfthPercent: string | number;
  twelfthStream: string;
  schoolName: string;
  udiseCode?: string;
}

export interface DocumentsData {
  profilePhoto?: string;
  lcCertificate?: string;
  marksheet10th?: string;
  marksheet12th?: string;
  casteCertificate?: string;
  migrationCertificate?: string;
}

export type StepData = PersonalInfoData | ContactInfoData | AcademicInfoData | DocumentsData;

// ─── Step Validators ────────────────────────────────────────────────────────

const GENDERS = ["male", "female", "other"] as const;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const CATEGORIES = ["SC", "ST", "OBC", "Open"] as const;
const BOARDS = ["GSEB", "CBSE", "ICSE", "IB", "STATE", "OTHER"] as const;

export function validateStep1(data: PersonalInfoData): ValidationResult {
  const errors: ValidationError[] = [];

  const rFullName = required(data.fullName, "fullName", "Full Name");
  if (rFullName) errors.push(rFullName);
  const mFullName = maxLen(data.fullName, "fullName", "Full Name", 150);
  if (mFullName) errors.push(mFullName);

  const rDob = required(data.dob, "dob", "Date of Birth");
  if (rDob) errors.push(rDob);
  else if (!isValidDate(data.dob)) {
    errors.push({ field: "dob", message: "Date of Birth is invalid" });
  }

  const rGender = required(data.gender, "gender", "Gender");
  if (rGender) errors.push(rGender);
  else if (!GENDERS.includes(data.gender as typeof GENDERS[number])) {
    errors.push({ field: "gender", message: "Gender must be male, female, or other" });
  }

  if (data.bloodGroup && !BLOOD_GROUPS.includes(data.bloodGroup as typeof BLOOD_GROUPS[number])) {
    errors.push({ field: "bloodGroup", message: "Invalid blood group" });
  }

  return { valid: errors.length === 0, errors };
}

export function validateStep2(data: ContactInfoData): ValidationResult {
  const errors: ValidationError[] = [];

  const rMobile = required(data.mobile, "mobile", "Mobile Number");
  if (rMobile) errors.push(rMobile);
  else if (!isValidPhone(data.mobile)) {
    errors.push({ field: "mobile", message: "Mobile must be a 10-digit number" });
  }

  if (data.parentMobile && !isValidPhone(data.parentMobile)) {
    errors.push({ field: "parentMobile", message: "Parent Mobile must be a 10-digit number" });
  }

  if (data.optionalMobile && !isValidPhone(data.optionalMobile)) {
    errors.push({ field: "optionalMobile", message: "Optional Mobile must be a 10-digit number" });
  }

  const rAddress = required(data.address, "address", "Address");
  if (rAddress) errors.push(rAddress);

  if (data.aadhaarStudent && !isValidAadhaar(data.aadhaarStudent)) {
    errors.push({ field: "aadhaarStudent", message: "Student Aadhaar must be 12 digits" });
  }

  if (data.aadhaarParent && !isValidAadhaar(data.aadhaarParent)) {
    errors.push({ field: "aadhaarParent", message: "Parent Aadhaar must be 12 digits" });
  }

  return { valid: errors.length === 0, errors };
}

export function validateStep3(data: AcademicInfoData): ValidationResult {
  const errors: ValidationError[] = [];

  const rCategory = required(data.category, "category", "Category");
  if (rCategory) errors.push(rCategory);
  else if (!CATEGORIES.includes(data.category as typeof CATEGORIES[number])) {
    errors.push({ field: "category", message: "Invalid category" });
  }

  const rBoard = required(data.board, "board", "Board");
  if (rBoard) errors.push(rBoard);
  else if (!BOARDS.includes(data.board as typeof BOARDS[number])) {
    errors.push({ field: "board", message: "Invalid board" });
  }

  const rPercent = required(data.twelfthPercent, "twelfthPercent", "12th Percentage");
  if (rPercent) errors.push(rPercent);
  else if (!isValidPercent(data.twelfthPercent)) {
    errors.push({ field: "twelfthPercent", message: "12th Percentage must be between 0 and 100" });
  }

  const rStream = required(data.twelfthStream, "twelfthStream", "12th Stream");
  if (rStream) errors.push(rStream);

  const rSchool = required(data.schoolName, "schoolName", "School Name");
  if (rSchool) errors.push(rSchool);

  return { valid: errors.length === 0, errors };
}

export function validateStep4(data: DocumentsData, category?: string, board?: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Profile photo is required
  if (!data.profilePhoto) {
    errors.push({ field: "profilePhoto", message: "Profile Photo is required" });
  }

  // LC is required
  if (!data.lcCertificate) {
    errors.push({ field: "lcCertificate", message: "LC (Leaving Certificate) is required" });
  }

  // 10th marksheet required
  if (!data.marksheet10th) {
    errors.push({ field: "marksheet10th", message: "10th Marksheet is required" });
  }

  // 12th marksheet required
  if (!data.marksheet12th) {
    errors.push({ field: "marksheet12th", message: "12th Marksheet is required" });
  }

  // Caste certificate required for non-Open categories
  if (category && category !== "Open" && !data.casteCertificate) {
    errors.push({ field: "casteCertificate", message: "Caste Certificate is required for your category" });
  }

  // Migration certificate required if board is not GSEB
  if (board && board !== "GSEB" && !data.migrationCertificate) {
    errors.push({ field: "migrationCertificate", message: "Migration Certificate is required for non-GSEB board" });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Run full validation across all steps — used before final submit.
 */
export function validateAllSteps(
  step1: PersonalInfoData,
  step2: ContactInfoData,
  step3: AcademicInfoData,
  step4: DocumentsData
): ValidationResult {
  const results = [
    validateStep1(step1),
    validateStep2(step2),
    validateStep3(step3),
    validateStep4(step4, step3.category, step3.board),
  ];

  const allErrors = results.flatMap((r) => r.errors);
  return { valid: allErrors.length === 0, errors: allErrors };
}

// ─── Export constants for form selects ───────────────────────────────────────

export { GENDERS, BLOOD_GROUPS, CATEGORIES, BOARDS };
