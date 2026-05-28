import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/app/lib/api-auth";
import { hasPermission } from "@/app/lib/permissions";
import { db } from "@/app/lib/db";
import { studentRequests, students, faculty } from "@/app/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { publishNotification } from "@/app/lib/notifications";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { ReviewStudentRequestSchema } from "@/app/lib/validations/schemas/request";

/**
 * GET /api/requests/[id]
 *
 * Returns full request detail.
 * Access: the student who created it OR the target faculty.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid request ID" },
        { status: 400 }
      );
    }

    const auth = await requireAnyPermission(req, [
      "requests.view_own",
      "requests.view_assigned",
      "requests.view_all",
    ]);
    if (auth instanceof NextResponse) return auth;

    const [request] = await db
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
      .where(eq(studentRequests.id, id));

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Access control: student who created OR target faculty OR admin
    const isOwnerStudent = auth.activeRole === "student" && request.studentId === auth.userId;
    const isTargetFaculty =
      hasPermission(auth.activeRole, "requests.review") &&
      request.targetFacultyId === auth.userId;
    const isAdmin = hasPermission(auth.activeRole, "requests.view_all");

    if (!isOwnerStudent && !isTargetFaculty && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you don't have access to this request" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("[GET /api/requests/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/requests/[id]
 *
 * Updates request status (approve / reject).
 * Only the target faculty can update status.
 * Body: { status: "approved" | "rejected", remarks?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid request ID" },
      { status: 400 }
    );
  }

  const auth = await requirePermission(req, "requests.review");
  if (auth instanceof NextResponse) return auth;

  const { userId, activeRole } = auth;

  const audit = AuditLogger.start(req, auth, {
    action: "requests.review",
    category: "requests",
    summary: "Faculty reviewed student request",
    entityType: "student_request",
    entityId: id,
  });

  try {
    // Verify request exists and belongs to this faculty
    const [request] = await db
      .select({ targetFacultyId: studentRequests.targetFacultyId })
      .from(studentRequests)
      .where(eq(studentRequests.id, id));

    if (!request) {
      return audit.error("Request not found", undefined, 404);
    }

    const isAdmin = hasPermission(activeRole, "requests.view_all");
    if (!isAdmin && request.targetFacultyId !== userId) {
      return audit.error("Forbidden: this request is not assigned to you", undefined, 403);
    }

    const body = await req.json();
    const parsed = validateBody(body, ReviewStudentRequestSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { status, remarks } = parsed.data;

    await db
      .update(studentRequests)
      .set({
        status,
        remarks: remarks || null,
        updatedAt: new Date(),
      })
      .where(eq(studentRequests.id, id));

    // Notify the student about the faculty decision
    const [requestDetail] = await db
      .select({
        studentId: studentRequests.studentId,
        subject: studentRequests.subject,
      })
      .from(studentRequests)
      .where(eq(studentRequests.id, id));

    if (requestDetail) {
      publishNotification({
        title: status === "approved" ? "Request Approved" : "Request Rejected",
        message: `Your request '${requestDetail.subject}' has been ${status} by the faculty.`,
        notificationType: "approval",
        receiverUserId: requestDetail.studentId,
        receiverRole: "student",
        createdBy: userId,
        relatedEntityType: "student_requests",
        relatedEntityId: id,
      });
    }

    const [updated] = await db
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
      .where(eq(studentRequests.id, id));

    return audit.success(
      NextResponse.json({
        success: true,
        data: updated,
      }),
      {
        sid: String(updated.studentId),
        status: status,
        remarks: remarks || undefined,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
