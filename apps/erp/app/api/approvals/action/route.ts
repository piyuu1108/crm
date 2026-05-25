import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  facultyRequests,
  facultyRequestApprovals,
  facultyRequestProxies,
  faculty,
  timetableSlots,
  administrators,
} from "@/app/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { publishNotification } from "@/app/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "approvals.approve");
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole } = auth;
    const body = await req.json();

    const { requestId, action, remarks, proxyOverrides = [] } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, error: "Invalid action type" },
        { status: 400 }
      );
    }

    // 1. Fetch request details and creator name
    const [request] = await db
      .select({
        id: facultyRequests.id,
        facultyId: facultyRequests.facultyId,
        facultyName: faculty.name,
        requestTypeCode: facultyRequests.requestTypeCode,
        fromDate: facultyRequests.fromDate,
        toDate: facultyRequests.toDate,
        status: facultyRequests.status,
        currentStepIndex: facultyRequests.currentStepIndex,
      })
      .from(facultyRequests)
      .innerJoin(faculty, eq(facultyRequests.facultyId, faculty.id))
      .where(eq(facultyRequests.id, requestId))
      .limit(1);

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Request is already finalized" },
        { status: 400 }
      );
    }

    // 2. Fetch all approvals in the workflow chain
    const steps = await db
      .select()
      .from(facultyRequestApprovals)
      .where(eq(facultyRequestApprovals.requestId, requestId))
      .orderBy(facultyRequestApprovals.sequenceOrder);

    // Identify current pending step that matches activeRole
    const activeStep = steps.find(
      (s) =>
        s.approverRole.toUpperCase() === activeRole.toUpperCase() &&
        s.status === "pending"
    );

    if (!activeStep) {
      return NextResponse.json(
        { success: false, error: `No active pending action for role: ${activeRole}` },
        { status: 400 }
      );
    }

    // Resolve name of current approver
    let approverName = "Approver";
    const [facultyApprover] = await db
      .select({ name: faculty.name })
      .from(faculty)
      .where(eq(faculty.id, userId))
      .limit(1);

    if (facultyApprover) {
      approverName = facultyApprover.name;
    } else {
      const [adminApprover] = await db
        .select({ name: administrators.name })
        .from(administrators)
        .where(eq(administrators.id, userId))
        .limit(1);
      if (adminApprover) {
        approverName = adminApprover.name;
      }
    }

    // 3. Atomically execute all approval/rejection updates
    const updatedRequest = await db.transaction(async (tx) => {
      // Update active approval step
      await tx
        .update(facultyRequestApprovals)
        .set({
          status: action,
          approverUserId: userId,
          remarks: remarks || null,
          actionedAt: new Date(),
        })
        .where(eq(facultyRequestApprovals.id, activeStep.id));

      if (action === "reject") {
        // Mark overall request as rejected
        const [reqObj] = await tx
          .update(facultyRequests)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(eq(facultyRequests.id, requestId))
          .returning();

        return { requestState: reqObj, isFinalized: true, actionStatus: "rejected" };
      }

      // Action is "approve" - check if there are subsequent steps in the chain
      const nextSequence = activeStep.sequenceOrder + 1;
      const nextStep = steps.find((s) => s.sequenceOrder === nextSequence);

      if (nextStep) {
        // Increment step and remain pending overall
        const [reqObj] = await tx
          .update(facultyRequests)
          .set({
            currentStepIndex: nextSequence,
            updatedAt: new Date(),
          })
          .where(eq(facultyRequests.id, requestId))
          .returning();

        return { requestState: reqObj, isFinalized: false, nextStep, actionStatus: "approved" };
      } else {
        // All steps approved! Finalize request status as approved
        const [reqObj] = await tx
          .update(facultyRequests)
          .set({
            status: "approved",
            updatedAt: new Date(),
          })
          .where(eq(facultyRequests.id, requestId))
          .returning();

        // Mark all proxies as approved
        await tx
          .update(facultyRequestProxies)
          .set({ status: "approved", updatedAt: new Date() })
          .where(eq(facultyRequestProxies.requestId, requestId));

        return { requestState: reqObj, isFinalized: true, actionStatus: "approved" };
      }
    });

    // ─── 4. APPLY PROXY OVERRIDES (IF SENT AND AUTHORIZED) ───
    if (proxyOverrides.length > 0 && activeRole !== "faculty" && activeRole !== "counselor") {
      for (const override of proxyOverrides) {
        // Fetch current assignment details
        const [originalProxy] = await db
          .select({
            id: facultyRequestProxies.id,
            date: facultyRequestProxies.date,
            slotId: facultyRequestProxies.slotId,
            proxyFacultyId: facultyRequestProxies.proxyFacultyId,
          })
          .from(facultyRequestProxies)
          .where(eq(facultyRequestProxies.id, override.proxyId))
          .limit(1);

        if (originalProxy && originalProxy.proxyFacultyId !== override.newProxyFacultyId) {
          // Perform update
          await db
            .update(facultyRequestProxies)
            .set({
              proxyFacultyId: override.newProxyFacultyId,
              status: "overridden",
              overriddenBy: userId,
              updatedAt: new Date(),
            })
            .where(eq(facultyRequestProxies.id, override.proxyId));

          // Fetch names and labels to personalize notifications
          const [oldFaculty] = await db
            .select({ name: faculty.name })
            .from(faculty)
            .where(eq(faculty.id, originalProxy.proxyFacultyId))
            .limit(1);

          const [newFaculty] = await db
            .select({ name: faculty.name })
            .from(faculty)
            .where(eq(faculty.id, override.newProxyFacultyId))
            .limit(1);

          const [slot] = await db
            .select({ label: timetableSlots.label })
            .from(timetableSlots)
            .where(eq(timetableSlots.id, originalProxy.slotId))
            .limit(1);

          const slotLabel = slot?.label || `Slot ${originalProxy.slotId}`;

          // Notification 1: Requesting Faculty
          publishNotification({
            title: "Proxy Assignment Updated by Approver",
            message: `Your lecture on ${originalProxy.date} for ${slotLabel} has been reassigned to ${newFaculty?.name || "new faculty"} (overridden from ${oldFaculty?.name || "previous"}).`,
            notificationType: "approval",
            receiverUserId: request.facultyId,
            receiverRole: "faculty",
            relatedEntityType: "faculty_requests",
            relatedEntityId: requestId,
          });

          // Notification 2: Original Proxy
          publishNotification({
            title: "Unassigned from Lecture Proxy",
            message: `You are no longer assigned as proxy for ${request.facultyName} on ${originalProxy.date} (${slotLabel}).`,
            notificationType: "approval",
            receiverUserId: originalProxy.proxyFacultyId,
            receiverRole: "faculty",
            relatedEntityType: "faculty_requests",
            relatedEntityId: requestId,
          });

          // Notification 3: New Proxy
          publishNotification({
            title: "Assigned as Proxy Faculty (Override)",
            message: `You have been selected to cover a lecture for ${request.facultyName} on ${originalProxy.date} during ${slotLabel} by ${activeRole.toUpperCase()} ${approverName}.`,
            notificationType: "approval",
            receiverUserId: override.newProxyFacultyId,
            receiverRole: "faculty",
            relatedEntityType: "faculty_requests",
            relatedEntityId: requestId,
          });
        }
      }
    }

    // ─── 5. WORKFLOW NOTIFICATION DISPATCHES ───
    if (updatedRequest.actionStatus === "rejected") {
      publishNotification({
        title: "Leave/WFH Request Rejected",
        message: `Your request for ${request.fromDate} to ${request.toDate} has been rejected by HOD/Principal. Remarks: ${remarks || "No remarks"}`,
        notificationType: "approval",
        receiverUserId: request.facultyId,
        receiverRole: "faculty",
        relatedEntityType: "faculty_requests",
        relatedEntityId: requestId,
        priority: "high",
      });
    } else if (updatedRequest.actionStatus === "approved") {
      if (updatedRequest.isFinalized) {
        // Request fully approved
        publishNotification({
          title: "Leave/WFH Request Approved",
          message: `Your request for ${request.fromDate} to ${request.toDate} has been fully approved by HOD & Principal.`,
          notificationType: "approval",
          receiverUserId: request.facultyId,
          receiverRole: "faculty",
          relatedEntityType: "faculty_requests",
          relatedEntityId: requestId,
          priority: "high",
        });
      } else if (updatedRequest.nextStep) {
        // Notify the next stage approver
        const nextRole = updatedRequest.nextStep.approverRole.toUpperCase();
        if (nextRole === "PRINCIPAL") {
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
              title: "Leave/WFH Approval Required (Principal)",
              message: `Faculty ${request.facultyName}'s request approved by HOD and is now pending your approval.`,
              notificationType: "approval",
              receiverUserId: p.id,
              receiverRole: "principal",
              relatedEntityType: "faculty_requests",
              relatedEntityId: requestId,
            });
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: updatedRequest.requestState });
  } catch (error) {
    console.error("[POST /api/approvals/action] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
