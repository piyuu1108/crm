import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { students, divisions, studentEnrollmentHistory } from "@/app/lib/schema";
import { eq, sql } from "drizzle-orm";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── POST /api/admin/divisions/[id]/students — Bulk upload students from CSV ──
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requirePermission(req, "admin.students");
    if (result instanceof NextResponse) return result;

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

    // Validate and check for duplicates inside the CSV payload itself
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const uniqueStudentRows: typeof studentRows = [];

    const results: { id: string; name: string; email: string; status: string; reason?: string }[] = [];
    const validStudents: { studentId: string; fullName: string; email: string }[] = [];

    for (const row of studentRows) {
      const rawId = row.id?.trim();
      const rawEmail = row.email?.trim();
      const name = row.name?.trim();

      if (!rawId || !rawEmail || !name) {
        results.push({ id: row.id || "", name: row.name || "", email: row.email || "", status: "error", reason: "Missing required fields" });
        continue;
      }

      const studentId = rawId.toUpperCase();
      const email = rawEmail.toLowerCase();

      if (seenIds.has(studentId)) {
        results.push({ id: rawId, name, email, status: "error", reason: "Duplicate Student ID in CSV payload" });
        continue;
      }
      if (seenEmails.has(email)) {
        results.push({ id: rawId, name, email, status: "error", reason: "Duplicate Email in CSV payload" });
        continue;
      }

      seenIds.add(studentId);
      seenEmails.add(email);
      uniqueStudentRows.push({ id: studentId, name, email });
    }

    // Pre-check for duplicates in the existing DB
    const incomingIds = uniqueStudentRows.map((s) => s.id);
    const incomingEmails = uniqueStudentRows.map((s) => s.email);

    let existingIdSet = new Set<string>();
    let existingEmailSet = new Set<string>();

    if (incomingIds.length > 0) {
      const existingById = await db
        .select({ studentId: students.studentId })
        .from(students)
        .where(
          sql`LOWER(${students.studentId}) IN (${sql.join(
            incomingIds.map((id: string) => sql`LOWER(${id})`),
            sql`, `
          )})`
        );
      existingIdSet = new Set(existingById.map((r) => r.studentId?.toUpperCase()).filter((id): id is string => id !== null));
    }

    if (incomingEmails.length > 0) {
      const existingByEmail = await db
        .select({ email: students.email })
        .from(students)
        .where(
          sql`LOWER(${students.email}) IN (${sql.join(
            incomingEmails.map((e: string) => sql`LOWER(${e})`),
            sql`, `
          )})`
        );
      existingEmailSet = new Set(existingByEmail.map((r) => r.email.toLowerCase()));
    }

    for (const row of uniqueStudentRows) {
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

    // Bulk insert valid students + enrollment history (transactional)
    if (validStudents.length > 0) {
      await db.transaction(async (tx) => {
        // Step 1: Insert students
        const insertedStudents = await tx.insert(students).values(
          validStudents.map((s) => ({
            studentId: s.studentId,
            fullName: s.fullName,
            email: s.email,
            courseId: division.courseId,
            entryType: division.semesterNo === 1 ? "fresh" : "old",
            entrySemesterNo: division.semesterNo,
            currentSemesterNo: division.semesterNo,
            currentDivisionId: division.id,
            currentDivisionName: division.displayName,
            status: "incomplete", // profile not submitted yet
          }))
        ).returning({ id: students.id, email: students.email });

        // Step 2: Insert enrollment history rows
        if (insertedStudents.length > 0) {
          await tx.insert(studentEnrollmentHistory).values(
            insertedStudents.map((s) => ({
              studentId: s.id,
              semesterId: division.semesterId,
              divisionId: division.id,
              status: "active",
            }))
          );
        }
      });
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
