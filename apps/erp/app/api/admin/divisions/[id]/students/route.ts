import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { students, divisions } from "@/app/lib/schema";
import { eq, or, sql, max, inArray } from "drizzle-orm";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
async function authorize() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid or expired session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── POST /api/admin/divisions/[id]/students — Bulk upload students from CSV ──
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

    const { id: idStr } = await params;
    const divisionId = parseInt(idStr, 10);
    if (isNaN(divisionId)) return err("Invalid division ID", 400);

    // Fetch division details
    const [division] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, divisionId))
      .limit(1);

    if (!division) return err("Division not found", 404);

    const body = await req.json();
    const { students: studentRows } = body;

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return err("No student data provided", 400);
    }

    // Validate and insert students
    const results: { id: string; name: string; email: string; status: string; reason?: string }[] = [];
    const validStudents: { studentId: string; fullName: string; email: string }[] = [];

    // Pre-check for duplicates in the existing DB
    const incomingIds = studentRows.map((s: { id: string }) => s.id);
    const incomingEmails = studentRows.map((s: { email: string }) => s.email);

    const existingById = await db
      .select({ studentId: students.studentId })
      .from(students)
      .where(
        sql`${students.studentId} IN (${sql.join(
          incomingIds.map((id: string) => sql`${id}`),
          sql`, `
        )})`
      );

    const existingByEmail = await db
      .select({ email: students.email })
      .from(students)
      .where(
        sql`${students.email} IN (${sql.join(
          incomingEmails.map((e: string) => sql`${e}`),
          sql`, `
        )})`
      );

    const existingIdSet = new Set(existingById.map((r) => r.studentId));
    const existingEmailSet = new Set(existingByEmail.map((r) => r.email));

    for (const row of studentRows) {
      const { id: studentId, name, email } = row;

      if (existingIdSet.has(studentId)) {
        results.push({ id: studentId, name, email, status: "error", reason: "Student ID already exists" });
        continue;
      }

      if (existingEmailSet.has(email)) {
        results.push({ id: studentId, name, email, status: "error", reason: "Email already registered" });
        continue;
      }

      validStudents.push({ studentId, fullName: name, email });
      results.push({ id: studentId, name, email, status: "success" });
    }

    // Bulk insert valid students
    if (validStudents.length > 0) {
      await db.insert(students).values(
        validStudents.map((s) => ({
          studentId: s.studentId,
          fullName: s.fullName,
          email: s.email,
          courseId: division.courseId,
          entryType: "fresh",
          entrySemesterNo: division.semesterNo,
          currentSemesterNo: division.semesterNo,
          currentDivisionId: division.id,
          currentDivisionName: division.displayName,
          status: "incomplete", // profile not submitted yet
        }))
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          total: studentRows.length,
          inserted: validStudents.length,
          errors: studentRows.length - validStudents.length,
          results,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/divisions/[id]/students] Error:", error);
    return err("Internal server error", 500);
  }
}
