import { z } from "zod";

export const AdminUpdateFacultySchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(100, "Name must be 100 characters or less"),
  email: z.string().trim().min(1, "Email is required").email("Invalid email format").max(150, "Email must be 150 characters or less"),
  mobile: z.string().trim().min(1, "Mobile number is required").regex(/^\d{10,15}$/, "Mobile must be 10–15 digits"),
  facultyCode: z.string().trim().min(1, "Faculty code is required").max(20, "Faculty code must be 20 characters or less"),
  designation: z.string().trim().max(100, "Designation must be 100 characters or less").optional().nullable(),
});

export type AdminUpdateFacultyInput = z.input<typeof AdminUpdateFacultySchema>;
export type AdminUpdateFacultyParsed = z.infer<typeof AdminUpdateFacultySchema>;
