import { z } from "zod";
import { NonEmptyString } from "./common";

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const LoginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: NonEmptyString,
}).refine(
  (d) => (d.identifier && d.identifier.trim().length > 0) || (d.email && d.email.trim().length > 0),
  { message: "Credential (identifier or email) is required", path: ["identifier"] }
).transform((d) => ({
  identifier: String(d.identifier ?? d.email ?? "").trim(),
  password: d.password,
}));

export type LoginInput = z.infer<typeof LoginSchema>;

// ─── POST /api/set-password ───────────────────────────────────────────────────

export const SetPasswordSchema = z
  .object({
    token: NonEmptyString,
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: NonEmptyString,
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SetPasswordInput = z.infer<typeof SetPasswordSchema>;
