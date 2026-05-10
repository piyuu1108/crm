import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ─── Course ───────────────────────────────────────────────────────────
export const courseSchema = z.object({
  name: z
    .string()
    .min(1, "Course name is required")
    .max(50, "Course name too long")
    .transform((v) => v.trim().toUpperCase()),
});

// ─── Specialization ──────────────────────────────────────────────────
export const specializationSchema = z.object({
  name: z.string().min(1, "Specialization name is required").max(100),
  shortCode: z
    .string()
    .min(1, "Short code is required")
    .max(10)
    .transform((v) => v.trim().toUpperCase()),
  courseId: z.number().int().positive("Course is required"),
});

// ─── Faculty ──────────────────────────────────────────────────────────
export const facultySchema = z.object({
  name: z.string().min(1, "Faculty name is required").max(255),
  code: z
    .string()
    .min(1, "Faculty code is required")
    .max(20)
    .transform((v) => v.trim().toUpperCase()),
  courseId: z.number().int().positive("Course is required"),
});

// ─── Subject ──────────────────────────────────────────────────────────
export const subjectSchema = z.object({
  code: z
    .string()
    .min(1, "Subject code is required")
    .max(20),
  name: z.string().min(1, "Subject name is required").max(255),
  shortCode: z
    .string()
    .min(1, "Short code is required")
    .max(20)
    .transform((v) => v.trim().toUpperCase()),
  credit: z.number().int().positive("Credit must be a positive integer"),
  type: z.enum(["Theory", "Practical", "Both", "ProjectMinor", "ProjectMajor"]),
  courseId: z.number().int().positive("Course is required"),
  semester: z.number().int().positive("Semester is required"),
});

// ─── Class ────────────────────────────────────────────────────────────
export const classSchema = z.object({
  year: z.number().int().min(0).max(99, "Year must be 2-digit"),
  semester: z.number().int().positive("Semester is required"),
  courseId: z.number().int().positive("Course is required"),
  specializationId: z.number().int().positive("Specialization is required"),
  divisionNumber: z.number().int().positive("Division number is required"),
});

// ─── Assignment ───────────────────────────────────────────────────────
export const assignmentSchema = z.object({
  subjectId: z.number().int().positive(),
  classId: z.number().int().positive(),
  facultyId: z.number().int().positive(),
});

// ─── Settings ─────────────────────────────────────────────────────────
export const workloadSettingSchema = z.object({
  value: z.number().int().positive("Workload limit must be a positive integer"),
});

// ─── Utility: Auto-suggest faculty code from name ─────────────────────
export function suggestFacultyCode(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

// ─── Utility: Auto-suggest subject short code from name ───────────────
export function suggestShortCode(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

// ─── Utility: Generate class name ─────────────────────────────────────
export function generateClassName(
  year: number,
  courseName: string,
  specShortCode: string,
  divisionNumber: number
): string {
  const yy = String(year).padStart(2, "0");
  return `${yy}${courseName}${specShortCode}${divisionNumber}`;
}

// ─── Rooms ────────────────────────────────────────────────────────────
export const roomSchema = z.object({
  name: z
    .string()
    .min(1, "Lab name is required")
    .max(100, "Lab name too long")
    .transform((v) => v.trim()),
});

// ─── Lab Sessions ─────────────────────────────────────────────────────
export const labSessionRowSchema = z.object({
  sessionType: z.enum(["Theory", "Lab"]),
  roomId: z.number().int().positive().nullable(),
  durationSlots: z.number().int().min(1).max(2),
});

export const saveLabSessionsSchema = z.object({
  sessions: z.array(labSessionRowSchema).min(1, "At least one session is required"),
});
