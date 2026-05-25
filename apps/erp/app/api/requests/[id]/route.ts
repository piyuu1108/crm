import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { studentRequests, students, faculty } from "@/app/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { publishNotification } from "@/app/lib/notifications";

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

    const payload = await getAuthContext(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Access control: student who created OR target faculty
    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    const isOwnerStudent = roles.includes("student") && request.studentId === payload.userId;
    const isTargetFaculty =
      (roles.includes("faculty") ||
        roles.includes("hod") ||
        roles.includes("counselor") ||
        roles.includes("principal") ||
        roles.includes("vice_principal")) &&
      request.targetFacultyId === payload.userId;

    if (!isOwnerStudent && !isTargetFaculty) {
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
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid request ID" },
        { status: 400 }
      );
    }

    const payload = await getAuthContext(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    const isAuthorized =
      roles.includes("faculty") ||
      roles.includes("hod") ||
      roles.includes("counselor") ||
      roles.includes("principal") ||
      roles.includes("vice_principal");

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Forbidden: faculty or administrator role required" },
        { status: 403 }
      );
    }

    // Verify request exists and belongs to this faculty
    const [request] = await db
      .select({ targetFacultyId: studentRequests.targetFacultyId })
      .from(studentRequests)
      .where(eq(studentRequests.id, id));

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.targetFacultyId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: this request is not assigned to you" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, remarks } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

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
        createdBy: payload.userId,
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

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[PATCH /api/requests/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 }
    );
  }
}
