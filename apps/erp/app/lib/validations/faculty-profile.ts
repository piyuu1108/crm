export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface FacultyPersonalInfoData {
  fullName: string;
  dob: string;
  gender: string;
}

export interface FacultyContactInfoData {
  mobile: string;
  alternateMobile?: string;
  address?: string;
}

export interface FacultyProfessionalInfoData {
  qualification: string;
  experienceYears: string | number;
  specialization: string;
  designation: string;
}

export interface FacultyDocumentsData {
  profilePhotoUrl?: string;
}

export const GENDERS = ["male", "female", "other"] as const;

function required(value: unknown, field: string, label: string): ValidationError | null {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return { field, message: `${label} is required` };
  }
  return null;
}

function isValidPhone(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^\d{10}$/.test(value.replace(/\s+/g, ""));
}

function isValidDate(value: string | undefined | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function validateFacultyStep1(data: FacultyPersonalInfoData): ValidationResult {
  const errors: ValidationError[] = [];
  const full = required(data.fullName, "fullName", "Full Name");
  if (full) errors.push(full);

  const dob = required(data.dob, "dob", "Date of Birth");
  if (dob) errors.push(dob);
  else if (!isValidDate(data.dob)) errors.push({ field: "dob", message: "Invalid date" });

  const gender = required(data.gender, "gender", "Gender");
  if (gender) errors.push(gender);
  else if (!GENDERS.includes(data.gender as (typeof GENDERS)[number])) {
    errors.push({ field: "gender", message: "Invalid gender" });
  }

  return { valid: errors.length === 0, errors };
}

export function validateFacultyStep2(data: FacultyContactInfoData): ValidationResult {
  const errors: ValidationError[] = [];
  const mobile = required(data.mobile, "mobile", "Mobile");
  if (mobile) errors.push(mobile);
  else if (!isValidPhone(data.mobile)) {
    errors.push({ field: "mobile", message: "Mobile must be 10 digits" });
  }
  if (data.alternateMobile && !isValidPhone(data.alternateMobile)) {
    errors.push({
      field: "alternateMobile",
      message: "Alternate mobile must be 10 digits",
    });
  }
  return { valid: errors.length === 0, errors };
}

export function validateFacultyStep3(data: FacultyProfessionalInfoData): ValidationResult {
  const errors: ValidationError[] = [];
  const qualification = required(data.qualification, "qualification", "Qualification");
  if (qualification) errors.push(qualification);
  const specialization = required(data.specialization, "specialization", "Specialization");
  if (specialization) errors.push(specialization);
  const designation = required(data.designation, "designation", "Designation");
  if (designation) errors.push(designation);
  const exp = required(data.experienceYears, "experienceYears", "Experience");
  if (exp) {
    errors.push(exp);
  } else {
    const years = Number(data.experienceYears);
    if (Number.isNaN(years) || years < 0 || years > 60) {
      errors.push({
        field: "experienceYears",
        message: "Experience must be between 0 and 60 years",
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateFacultyStep4(data: FacultyDocumentsData): ValidationResult {
  const errors: ValidationError[] = [];
  if (!data.profilePhotoUrl) {
    errors.push({ field: "profilePhotoUrl", message: "Profile photo is required" });
  }
  return { valid: errors.length === 0, errors };
}
