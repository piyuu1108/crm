// ─── Subject validation for HOD subject management ──────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export const SUBJECT_TYPES = ["theory", "practical", "both", "project_minor", "project_major"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export interface SubjectFormData {
  code: string;
  name: string;
  subjectType: string;
  internalTheoryMax: string;
  externalTheoryMax: string;
  theoryPassingMarks: string;
  internalPracticalMax: string;
  externalPracticalMax: string;
  practicalPassingMarks: string;
}

export const INITIAL_SUBJECT_FORM: SubjectFormData = {
  code: "",
  name: "",
  subjectType: "",
  internalTheoryMax: "",
  externalTheoryMax: "",
  theoryPassingMarks: "",
  internalPracticalMax: "",
  externalPracticalMax: "",
  practicalPassingMarks: "",
};

/**
 * Subject code: alphanumeric + dash, non-empty, max 20 chars.
 * Valid: "101", "BCA101", "301-01", "301-02"
 */
const SUBJECT_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/;

function requiredStr(value: string | undefined, field: string, label: string): ValidationError | null {
  if (!value || value.trim().length === 0) {
    return { field, message: `${label} is required` };
  }
  return null;
}

function requiredNonNegInt(value: string | undefined, field: string, label: string): ValidationError | null {
  if (value === undefined || value === null || value.trim() === "") {
    return { field, message: `${label} is required` };
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
    return { field, message: `${label} must be a non-negative whole number` };
  }
  return null;
}

export function validateSubjectForm(data: SubjectFormData): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Basic info ──
  const codeErr = requiredStr(data.code, "code", "Subject Code");
  if (codeErr) {
    errors.push(codeErr);
  } else if (!SUBJECT_CODE_REGEX.test(data.code.trim())) {
    errors.push({
      field: "code",
      message: "Subject code may only contain letters, digits, and dashes (max 20 chars)",
    });
  }

  const nameErr = requiredStr(data.name, "name", "Subject Name");
  if (nameErr) errors.push(nameErr);
  else if (data.name.trim().length > 100) {
    errors.push({ field: "name", message: "Subject name must be 100 characters or less" });
  }

  const typeErr = requiredStr(data.subjectType, "subjectType", "Subject Type");
  if (typeErr) {
    errors.push(typeErr);
  } else if (!SUBJECT_TYPES.includes(data.subjectType as SubjectType)) {
    errors.push({ field: "subjectType", message: "Invalid subject type" });
  }

  const type = data.subjectType as SubjectType;

  // ── Theory marks (required for "theory" and "both") ──
  if (type === "theory" || type === "both") {
    const itErr = requiredNonNegInt(data.internalTheoryMax, "internalTheoryMax", "Internal Theory Marks");
    if (itErr) errors.push(itErr);

    const etErr = requiredNonNegInt(data.externalTheoryMax, "externalTheoryMax", "External Theory Marks");
    if (etErr) errors.push(etErr);

    const tpErr = requiredNonNegInt(data.theoryPassingMarks, "theoryPassingMarks", "Passing Theory Marks");
    if (tpErr) errors.push(tpErr);

    // Cross-field: total must be > 0, passing <= total
    if (!itErr && !etErr && !tpErr) {
      const itMax = Number(data.internalTheoryMax);
      const etMax = Number(data.externalTheoryMax);
      const tPass = Number(data.theoryPassingMarks);
      const totalTheory = itMax + etMax;
      if (totalTheory <= 0) {
        errors.push({ field: "internalTheoryMax", message: "Total theory marks must be greater than 0" });
      }
      if (tPass > totalTheory) {
        errors.push({
          field: "theoryPassingMarks",
          message: `Passing marks (${tPass}) cannot exceed total theory marks (${totalTheory})`,
        });
      }
    }
  }

  // ── Practical marks (required for "practical" and "both") ──
  if (type === "practical" || type === "both") {
    const ipErr = requiredNonNegInt(data.internalPracticalMax, "internalPracticalMax", "Internal Practical Marks");
    if (ipErr) errors.push(ipErr);

    const epErr = requiredNonNegInt(data.externalPracticalMax, "externalPracticalMax", "External Practical Marks");
    if (epErr) errors.push(epErr);

    const ppErr = requiredNonNegInt(data.practicalPassingMarks, "practicalPassingMarks", "Passing Practical Marks");
    if (ppErr) errors.push(ppErr);

    if (!ipErr && !epErr && !ppErr) {
      const ipMax = Number(data.internalPracticalMax);
      const epMax = Number(data.externalPracticalMax);
      const pPass = Number(data.practicalPassingMarks);
      const totalPractical = ipMax + epMax;
      if (totalPractical <= 0) {
        errors.push({ field: "internalPracticalMax", message: "Total practical marks must be greater than 0" });
      }
      if (pPass > totalPractical) {
        errors.push({
          field: "practicalPassingMarks",
          message: `Passing marks (${pPass}) cannot exceed total practical marks (${totalPractical})`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
