import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { studentRequests, students, faculty, semesters } from "@/app/lib/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { publishNotification } from "@/app/lib/notifications";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody, validateQuery } from "@/app/lib/validations/validate";
import { CreateStudentRequestSchema, GetRequestsQuerySchema } from "@/app/lib/validations/schemas/request";

/**
 * GET /api/requests
 *
 * Returns paginated list of requests for the authenticated student.
 * Query params: ?status=pending|approved|rejected  &limit=  &offset=
 */
export async function GET(req: NextRequest) {
  try {
    const result = await requirePermission(req, "requests.view_own");
    if (result instanceof NextResponse) return result;
    const payload = result;

    const { searchParams } = new URL(req.url);
    const parsed = validateQuery(searchParams, GetRequestsQuerySchema);
    if (!parsed.success) return parsed.error;

    const { status, limit, offset } = parsed.data;

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
  const result = await requirePermission(req, "requests.create");
  if (result instanceof NextResponse) return result;
  const payload = result;

  const audit = AuditLogger.start(req, payload, {
    action: "requests.create",
    category: "requests",
    summary: "Created student request",
    entityType: "student_request",
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, CreateStudentRequestSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const {
      subject,
      description,
      targetFacultyId,
      requestType,
      attachmentUrl,
      attachmentType,
      attachmentSize,
    } = parsed.data;

    // ── Look up student info ────────────────────────────────────────────
    const [student] = await db
      .select({
        fullName: students.fullName,
        currentDivisionName: students.currentDivisionName,
      })
      .from(students)
      .where(eq(students.id, payload.userId));

    if (!student) {
      return audit.error("Student record not found", undefined, 404);
    }

    // ── Look up faculty info ────────────────────────────────────────────
    const [targetFaculty] = await db
      .select({ name: faculty.name })
      .from(faculty)
      .where(and(eq(faculty.id, targetFacultyId), eq(faculty.isActive, true)));

    if (!targetFaculty) {
      return audit.error("Selected faculty not found or inactive", undefined, 404);
    }

    // ── Get active semester ─────────────────────────────────────────────
    const [activeSem] = await db
      .select({ id: semesters.id })
      .from(semesters)
      .where(eq(semesters.isActive, true))
      .limit(1);

    if (!activeSem) {
      return audit.error("No active semester found", undefined, 400);
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

    publishNotification({
      title: `New Request: ${subject.trim()}`,
      message: `${student.fullName} has submitted a new request of type '${requestType.trim()}'.`,
      notificationType: "leave_request",
      receiverUserId: targetFacultyId,
      receiverRole: "faculty",
      priority: "medium",
      createdBy: payload.userId,
      relatedEntityType: "student_requests",
      relatedEntityId: insertedRow.id,
    });

    const inserted = {
      ...insertedRow,
      studentName: student.fullName,
      targetFacultyName: targetFaculty.name,
      divisionName: student.currentDivisionName || "N/A",
    };

    return audit.success(
      NextResponse.json({
        success: true,
        data: inserted,
      }, { status: 201 }),
      {
        eid: String(insertedRow.id),
        fid: String(targetFacultyId),
        sub: subject.trim(),
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
