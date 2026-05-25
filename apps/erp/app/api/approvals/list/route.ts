import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  facultyRequests,
  faculty,
  facultyRequestTypes,
  facultyRequestApprovals,
  facultyRequestDocuments,
  facultyRequestProxies,
  timetableSlots,
  divisions,
  subjects,
} from "@/app/lib/schema";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "approvals.view");
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole } = auth;
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id"); // Fetch single request detail

    // ─── 1. FETCH DETAIL FOR SINGLE REQUEST ───
    if (idParam) {
      const requestId = parseInt(idParam, 10);
      if (isNaN(requestId)) {
        return NextResponse.json(
          { success: false, error: "Invalid requestId" },
          { status: 400 }
        );
      }

      // Fetch the main request details
      const [request] = await db
        .select({
          id: facultyRequests.id,
          facultyId: facultyRequests.facultyId,
          facultyName: faculty.name,
          requestTypeCode: facultyRequests.requestTypeCode,
          requestTypeName: facultyRequestTypes.name,
          fromDate: facultyRequests.fromDate,
          toDate: facultyRequests.toDate,
          description: facultyRequests.description,
          status: facultyRequests.status,
          currentStepIndex: facultyRequests.currentStepIndex,
          createdAt: facultyRequests.createdAt,
        })
        .from(facultyRequests)
        .innerJoin(faculty, eq(facultyRequests.facultyId, faculty.id))
        .innerJoin(
          facultyRequestTypes,
          eq(facultyRequests.requestTypeCode, facultyRequestTypes.code)
        )
        .where(eq(facultyRequests.id, requestId))
        .limit(1);

      if (!request) {
        return NextResponse.json(
          { success: false, error: "Request not found" },
          { status: 404 }
        );
      }

      // Authorization guard: must be creator OR hold approvals.approve
      const canApprove =
        activeRole === "hod" ||
        activeRole === "principal" ||
        activeRole === "vice_principal";

      if (request.facultyId !== userId && !canApprove) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      // Fetch uploaded documents
      const docs = await db
        .select({
          id: facultyRequestDocuments.id,
          fileName: facultyRequestDocuments.fileName,
          fileUrl: facultyRequestDocuments.fileUrl,
          fileSize: facultyRequestDocuments.fileSize,
        })
        .from(facultyRequestDocuments)
        .where(eq(facultyRequestDocuments.requestId, requestId));

      // Fetch approval history
      const approvals = await db
        .select({
          id: facultyRequestApprovals.id,
          approverRole: facultyRequestApprovals.approverRole,
          approverUserId: facultyRequestApprovals.approverUserId,
          approverName: faculty.name,
          status: facultyRequestApprovals.status,
          remarks: facultyRequestApprovals.remarks,
          sequenceOrder: facultyRequestApprovals.sequenceOrder,
          actionedAt: facultyRequestApprovals.actionedAt,
        })
        .from(facultyRequestApprovals)
        .leftJoin(faculty, eq(facultyRequestApprovals.approverUserId, faculty.id))
        .where(eq(facultyRequestApprovals.requestId, requestId))
        .orderBy(facultyRequestApprovals.sequenceOrder);

      // Fetch proxy assignments with slots details
      const senderProxyFaculty = alias(faculty, "sender_proxy_faculty");
      const proxies = await db
        .select({
          id: facultyRequestProxies.id,
          date: facultyRequestProxies.date,
          slotId: facultyRequestProxies.slotId,
          slotLabel: timetableSlots.label,
          startTime: timetableSlots.startTime,
          endTime: timetableSlots.endTime,
          proxyFacultyId: facultyRequestProxies.proxyFacultyId,
          proxyFacultyName: faculty.name,
          proxyFacultyCode: faculty.facultyCode,
          senderProxyFacultyId: facultyRequestProxies.senderProxyFacultyId,
          senderProxyFacultyName: senderProxyFaculty.name,
          senderProxyFacultyCode: senderProxyFaculty.facultyCode,
          divisionId: facultyRequestProxies.divisionId,
          divisionName: divisions.displayName,
          subjectId: facultyRequestProxies.subjectId,
          subjectName: subjects.name,
          status: facultyRequestProxies.status,
        })
        .from(facultyRequestProxies)
        .innerJoin(timetableSlots, eq(facultyRequestProxies.slotId, timetableSlots.id))
        .innerJoin(faculty, eq(facultyRequestProxies.proxyFacultyId, faculty.id))
        .leftJoin(senderProxyFaculty, eq(facultyRequestProxies.senderProxyFacultyId, senderProxyFaculty.id))
        .innerJoin(divisions, eq(facultyRequestProxies.divisionId, divisions.id))
        .innerJoin(subjects, eq(facultyRequestProxies.subjectId, subjects.id))
        .where(eq(facultyRequestProxies.requestId, requestId))
        .orderBy(facultyRequestProxies.date, timetableSlots.startTime);

      return NextResponse.json({
        success: true,
        data: {
          request,
          documents: docs,
          approvals,
          proxies,
        },
      });
    }

    // ─── 2. FETCH LIST OF REQUESTS ───
    let results;

    if (activeRole === "faculty" || activeRole === "counselor") {
      // Ordinary faculty can only see their own submitted requests
      results = await db
        .select({
          id: facultyRequests.id,
          facultyName: faculty.name,
          requestTypeCode: facultyRequests.requestTypeCode,
          requestTypeName: facultyRequestTypes.name,
          fromDate: facultyRequests.fromDate,
          toDate: facultyRequests.toDate,
          status: facultyRequests.status,
          currentStepIndex: facultyRequests.currentStepIndex,
          createdAt: facultyRequests.createdAt,
        })
        .from(facultyRequests)
        .innerJoin(faculty, eq(facultyRequests.facultyId, faculty.id))
        .innerJoin(
          facultyRequestTypes,
          eq(facultyRequests.requestTypeCode, facultyRequestTypes.code)
        )
        .where(eq(facultyRequests.facultyId, userId))
        .orderBy(desc(facultyRequests.createdAt));
    } else {
      // Approvers (HOD, Principal, Vice Principal) see all matching requests
      // Plus their own requests
      results = await db
        .select({
          id: facultyRequests.id,
          facultyName: faculty.name,
          requestTypeCode: facultyRequests.requestTypeCode,
          requestTypeName: facultyRequestTypes.name,
          fromDate: facultyRequests.fromDate,
          toDate: facultyRequests.toDate,
          status: facultyRequests.status,
          currentStepIndex: facultyRequests.currentStepIndex,
          createdAt: facultyRequests.createdAt,
        })
        .from(facultyRequests)
        .innerJoin(faculty, eq(facultyRequests.facultyId, faculty.id))
        .innerJoin(
          facultyRequestTypes,
          eq(facultyRequests.requestTypeCode, facultyRequestTypes.code)
        )
        .orderBy(desc(facultyRequests.createdAt));
    }

    // Enrich lists with the active "Pending With" role name
    const enrichedResults = await Promise.all(
      results.map(async (row) => {
        const approvalSteps = await db
          .select({ approverRole: facultyRequestApprovals.approverRole })
          .from(facultyRequestApprovals)
          .where(
            and(
              eq(facultyRequestApprovals.requestId, row.id),
              eq(facultyRequestApprovals.status, "pending")
            )
          )
          .orderBy(facultyRequestApprovals.sequenceOrder);

        const pendingWith = approvalSteps.length > 0 ? approvalSteps[0].approverRole : "Completed";

        return {
          ...row,
          pendingWith,
        };
      })
    );

    return NextResponse.json({ success: true, data: enrichedResults });
  } catch (error) {
    console.error("[GET /api/approvals/list] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
