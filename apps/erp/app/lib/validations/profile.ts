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

function isValidPincode(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^\d{6}$/.test(value.trim());
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

export type AddressKind = "home" | "hostel" | "pg" | "relative";

export interface CurrentAddressData {
  line1: string;
  city: string;
  pincode: string; // 6 digits exactly
  kind: AddressKind;
}

export interface HomeAddressData {
  line1: string;
  city: string;
  pincode: string; // 6 digits exactly
}

export interface StudentAddressData {
  current: CurrentAddressData;
  /** Required when current.kind is "hostel" or "pg" */
  home?: HomeAddressData;
}

export interface ContactInfoData {
  mobile: string;
  parentMobile?: string;
  optionalMobile?: string;
  address: StudentAddressData;
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
export const ADDRESS_KINDS: AddressKind[] = ["home", "hostel", "pg", "relative"];
const HOSTEL_KINDS: AddressKind[] = ["hostel", "pg"];

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

  // Mobile
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

  // Current address
  const addr = data.address;
  if (!addr || !addr.current) {
    errors.push({ field: "address.current.line1", message: "Current address is required" });
  } else {
    const cur = addr.current;

    const rLine1 = required(cur.line1, "address.current.line1", "Address Line 1");
    if (rLine1) errors.push(rLine1);
    else {
      const mLine1 = maxLen(cur.line1, "address.current.line1", "Address Line 1", 200);
      if (mLine1) errors.push(mLine1);
    }

    const rCity = required(cur.city, "address.current.city", "City");
    if (rCity) errors.push(rCity);
    else {
      const mCity = maxLen(cur.city, "address.current.city", "City", 100);
      if (mCity) errors.push(mCity);
    }

    const rPincode = required(cur.pincode, "address.current.pincode", "Pincode");
    if (rPincode) errors.push(rPincode);
    else if (!isValidPincode(cur.pincode)) {
      errors.push({ field: "address.current.pincode", message: "Pincode must be exactly 6 digits" });
    }

    if (!cur.kind || !ADDRESS_KINDS.includes(cur.kind)) {
      errors.push({ field: "address.current.kind", message: "Address type is required" });
    }

    // Home address required when kind is hostel or pg
    if (cur.kind && HOSTEL_KINDS.includes(cur.kind)) {
      const home = addr.home;
      if (!home) {
        errors.push({ field: "address.home.line1", message: "Home address is required for hostel/PG residents" });
      } else {
        const rHLine1 = required(home.line1, "address.home.line1", "Home Address Line 1");
        if (rHLine1) errors.push(rHLine1);
        else {
          const mHLine1 = maxLen(home.line1, "address.home.line1", "Home Address Line 1", 200);
          if (mHLine1) errors.push(mHLine1);
        }

        const rHCity = required(home.city, "address.home.city", "Home City");
        if (rHCity) errors.push(rHCity);

        const rHPincode = required(home.pincode, "address.home.pincode", "Home Pincode");
        if (rHPincode) errors.push(rHPincode);
        else if (!isValidPincode(home.pincode)) {
          errors.push({ field: "address.home.pincode", message: "Home Pincode must be exactly 6 digits" });
        }
      }
    }
  }

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

  if (!data.profilePhoto) {
    errors.push({ field: "profilePhoto", message: "Profile Photo is required" });
  }

  if (!data.lcCertificate) {
    errors.push({ field: "lcCertificate", message: "LC (Leaving Certificate) is required" });
  }

  if (!data.marksheet10th) {
    errors.push({ field: "marksheet10th", message: "10th Marksheet is required" });
  }

  if (!data.marksheet12th) {
    errors.push({ field: "marksheet12th", message: "12th Marksheet is required" });
  }

  if (category && category !== "Open" && !data.casteCertificate) {
    errors.push({ field: "casteCertificate", message: "Caste Certificate is required for your category" });
  }

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
