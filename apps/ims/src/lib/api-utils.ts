/**
 * Safely parse a string to an integer. Returns null if the value is not a valid integer.
 */
export function safeParseInt(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Returns a 400 JSON Response for invalid ID parameters.
 */
export function invalidIdResponse(paramName = "id") {
  return Response.json(
    { error: `Invalid ${paramName}: must be a valid integer` },
    { status: 400 }
  );
}
