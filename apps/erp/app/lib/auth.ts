import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-fallback-secret-key-12345"
);

export type AuthPayload = {
  userId: number;
  roles: string[];
  activeRole?: string;

  // All faculty/HOD — course they belong to
  courseId?: number;

  // Student
  divisionId?: number;
  semesterId?: number;

  // Counselor
  counselorDivisionIds?: readonly number[];

  // Shared
  academicYearId?: number;
};

export interface JWTPayload extends AuthPayload {
  email: string;
  facultyCode?: string;
  studentId?: string;
  [key: string]: unknown;
}

/**
 * Sign a new JWT token valid for 24 hours.
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token and return its payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}
