import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { studentRequests, students, faculty, semesters } from "@/app/lib/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

/**
 * GET /api/requests
 *
 * Returns paginated list of requests for the authenticated student.
 * Query params: ?status=pending|approved|rejected  &limit=  &offset=
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.includes("student")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: student role required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build conditions
    const conditions = [eq(studentRequests.studentId, payload.userId)];
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      conditions.push(eq(studentRequests.status, status));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const results = await db
      .select({
        id: studentRequests.id,
        studentId: studentRequests.studentId,
        targetFacultyId: studentRequests.targetFacultyId,
        semesterId: studentRequests.semesterId,
        requestType: studentRequests.requestType,
        subject: studentRequests.subject,
        description: studentRequests.description,
        status: studentRequests.status,
        remarks: studentRequests.remarks,
        attachmentUrl: studentRequests.attachmentUrl,
        attachmentType: studentRequests.attachmentType,
        attachmentSize: studentRequests.attachmentSize,
        createdAt: studentRequests.createdAt,
        updatedAt: studentRequests.updatedAt,
        studentName: students.fullName,
        targetFacultyName: faculty.name,
        divisionName: sql<string>`coalesce(${students.currentDivisionName}, 'N/A')`,
      })
      .from(studentRequests)
      .innerJoin(students, eq(studentRequests.studentId, students.id))
      .innerJoin(faculty, eq(studentRequests.targetFacultyId, faculty.id))
      .where(whereClause)
      .orderBy(desc(studentRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ totalCount }] = await db
      .select({ totalCount: count(studentRequests.id) })
      .from(studentRequests)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        total: Number(totalCount),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[GET /api/requests]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/requests
 *
 * Creates a new student request.
 * Body: { subject, description, targetFacultyId, requestType?, attachmentUrl?, attachmentType?, attachmentSize? }
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.includes("student")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: student role required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      subject,
      description,
      targetFacultyId,
      requestType = "general",
      attachmentUrl,
      attachmentType,
      attachmentSize,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Subject (title) is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    if (!targetFacultyId || typeof targetFacultyId !== "number") {
      return NextResponse.json(
        { success: false, error: "Target faculty is required" },
        { status: 400 }
      );
    }

    // ── Look up student info ────────────────────────────────────────────
    const [student] = await db
      .select({
        fullName: students.fullName,
        currentDivisionName: students.currentDivisionName,
      })
      .from(students)
      .where(eq(students.id, payload.userId));

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student record not found" },
        { status: 404 }
      );
    }

    // ── Look up faculty info ────────────────────────────────────────────
    const [targetFaculty] = await db
      .select({ name: faculty.name })
      .from(faculty)
      .where(and(eq(faculty.id, targetFacultyId), eq(faculty.isActive, true)));

    if (!targetFaculty) {
      return NextResponse.json(
        { success: false, error: "Selected faculty not found or inactive" },
        { status: 404 }
      );
    }

    // ── Get active semester ─────────────────────────────────────────────
    const [activeSem] = await db
      .select({ id: semesters.id })
      .from(semesters)
      .where(eq(semesters.isActive, true))
      .limit(1);

    if (!activeSem) {
      return NextResponse.json(
        { success: false, error: "No active semester found" },
        { status: 400 }
      );
    }

    // ── Insert ──────────────────────────────────────────────────────────
    const [insertedRow] = await db
      .insert(studentRequests)
      .values({
        studentId: payload.userId,
        targetFacultyId,
        semesterId: activeSem.id,
        requestType: requestType.trim(),
        subject: subject.trim(),
        description: description.trim(),
        status: "pending",
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        attachmentSize: attachmentSize || null,
      })
      .returning();

    const inserted = {
      ...insertedRow,
      studentName: student.fullName,
      targetFacultyName: targetFaculty.name,
      divisionName: student.currentDivisionName || "N/A",
    };

    return NextResponse.json({
      success: true,
      data: inserted,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/requests]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create request" },
      { status: 500 }
    );
  }
}
