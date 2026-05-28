import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Validation result — either typed parsed data or a pre-built error response.
 *
 * Usage in routes:
 *   const result = validateBody(body, MySchema);
 *   if (!result.success) return audit.error("Validation failed", result.error);
 *   const { field1, field2 } = result.data;
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse };

/**
 * Safe-parse a request body against a Zod schema.
 * Returns typed data on success, or a formatted 400 NextResponse on failure.
 *
 * Error response format matches existing ERP convention:
 *   { success: false, error: "Validation failed", errors: [...] }
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodType<T>
): ValidationResult<T> {
  const result = schema.safeParse(body);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      error: NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          errors: fieldErrors,
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}
