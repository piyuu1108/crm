import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  facultyRequests,
  facultyApprovalConfigs,
  facultyRequestDocuments,
  facultyRequestApprovals,
  facultyRequestProxies,
  faculty,
  facultyRoles,
  roles,
  administrators,
} from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";
import { publishNotification } from "@/app/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "approvals.create");
    if (auth instanceof NextResponse) return auth;

    const { userId } = auth;
    const body = await req.json();

    const {
      requestTypeCode,
      fromDate,
      toDate,
      description,
      document,
      proxies = [],
    } = body;

    if (!requestTypeCode || !fromDate || !toDate || !description) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Fetch requesting faculty details to resolve course scope and name
    const [facultyUser] = await db
      .select({
        name: faculty.name,
        courseId: faculty.courseId,
      })
      .from(faculty)
      .where(eq(faculty.id, userId))
      .limit(1);

    if (!facultyUser) {
      return NextResponse.json(
        { success: false, error: "Faculty not found" },
        { status: 404 }
      );
    }

    // 2. Fetch the dynamic approval chain configuration
    const [config] = await db
      .select()
      .from(facultyApprovalConfigs)
      .where(
        and(
          eq(facultyApprovalConfigs.requestTypeCode, requestTypeCode),
          eq(facultyApprovalConfigs.isActive, true)
        )
      )
      .limit(1);

    const chain = (config?.approvalChain as string[]) || ["HOD"];

    // 3. Atomically perform creation inside a database transaction
    const newRequest = await db.transaction(async (tx) => {
      // Create request entry
      const [insertedRequest] = await tx
        .insert(facultyRequests)
        .values({
          facultyId: userId,
          requestTypeCode,
          fromDate,
          toDate,
          description,
          status: "pending",
          currentStepIndex: 0,
        })
        .returning();

      // Create document entry if present
      if (document && document.fileUrl) {
        await tx.insert(facultyRequestDocuments).values({
          requestId: insertedRequest.id,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileSize: document.fileSize || null,
        });
      }

      // Create sequence entries for the approval chain
      const approvalEntries = chain.map((roleName, index) => ({
        requestId: insertedRequest.id,
        approverRole: roleName.toUpperCase(),
        status: "pending" as const,
        sequenceOrder: index,
      }));
      await tx.insert(facultyRequestApprovals).values(approvalEntries);

      // Create proxy entries if specified (mandatory for leave approval)
      if (requestTypeCode === "leave_approval" && proxies.length > 0) {
        const proxyEntries = proxies.map((p: any) => ({
          requestId: insertedRequest.id,
          date: p.date,
          slotId: p.slotId,
          originalFacultyId: userId,
          proxyFacultyId: p.proxyFacultyId,
          divisionId: p.divisionId,
          subjectId: p.subjectId,
          status: "pending" as const,
        }));
        await tx.insert(facultyRequestProxies).values(proxyEntries);
      }

      return insertedRequest;
    });

    // 4. Dispatch Notifications Asynchronously
    // Notify first approver in the chain (sequenceOrder = 0)
    const firstApproverRole = chain[0].toUpperCase();
    if (firstApproverRole === "HOD") {
      // Find HOD(s) for the requesting faculty's course
      const courseHods = await db
        .select({ id: faculty.id })
        .from(faculty)
        .innerJoin(facultyRoles, eq(faculty.id, facultyRoles.facultyId))
        .innerJoin(roles, eq(facultyRoles.roleId, roles.id))
        .where(
          and(
            eq(roles.name, "hod"),
            eq(faculty.courseId, facultyUser.courseId),
            eq(faculty.isActive, true)
          )
        );

      courseHods.forEach((hod) => {
        publishNotification({
          title: "New Leave/WFH Approval Required",
          message: `Faculty ${facultyUser.name} submitted a new request for ${fromDate} to ${toDate} requiring your approval.`,
          notificationType: "approval",
          receiverUserId: hod.id,
          receiverRole: "hod",
          relatedEntityType: "faculty_requests",
          relatedEntityId: newRequest.id,
        });
      });
    } else if (firstApproverRole === "PRINCIPAL") {
      const principals = await db
        .select({ id: administrators.id })
        .from(administrators)
        .where(
          and(
            eq(administrators.designation, "principal"),
            eq(administrators.isActive, true)
          )
        );

      principals.forEach((p) => {
        publishNotification({
          title: "New Leave/WFH Approval Required",
          message: `Faculty ${facultyUser.name} submitted a new request requiring Principal approval.`,
          notificationType: "approval",
          receiverUserId: p.id,
          receiverRole: "principal",
          relatedEntityType: "faculty_requests",
          relatedEntityId: newRequest.id,
        });
      });
    }

    // Notify proxy faculties about their assignments
    if (requestTypeCode === "leave_approval" && proxies.length > 0) {
      proxies.forEach((p: any) => {
        publishNotification({
          title: "Assigned as Proxy Faculty",
          message: `You have been selected by ${facultyUser.name} to cover a lecture on ${p.date} for slot ${p.slotLabel || "assigned"}.`,
          notificationType: "approval",
          receiverUserId: p.proxyFacultyId,
          receiverRole: "faculty",
          relatedEntityType: "faculty_requests",
          relatedEntityId: newRequest.id,
        });
      });
    }

    return NextResponse.json({ success: true, data: newRequest });
  } catch (error) {
    console.error("[POST /api/approvals/submit] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
