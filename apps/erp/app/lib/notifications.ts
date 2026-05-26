import { getConvexClient } from "./convex";
import { api } from "../../convex/_generated/api";

// Priority mapping configuration per notification type.
export const NOTIFICATION_TYPE_PRIORITIES: Record<string, "low" | "medium" | "high"> = {
  student_application: "medium",
  leave_request: "medium",
  approval: "medium",
  timetable_change: "medium",
  assignment_update: "medium",
  fee_event: "high",
  counselor_action: "medium",
  admin_action: "high",
  system_alert: "high",
};

/**
 * Publishes a notification by writing directly to Convex.
 * Fire-and-forget: does not block the calling API route.
 * All 16+ call sites across the codebase use this function unchanged.
 */
export function publishNotification(data: {
  title: string;
  message: string;
  notificationType: string;
  receiverUserId: number;
  receiverRole: string;
  priority?: "low" | "medium" | "high";
  createdBy?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  metadata?: any;
}) {
  const resolvedPriority =
    data.priority ||
    NOTIFICATION_TYPE_PRIORITIES[data.notificationType] ||
    "medium";

  // Fire-and-forget Convex mutation — preserves the same async semantics
  // as the previous EventEmitter pattern.
  getConvexClient()
    .mutation(api.notifications.create, {
      title: data.title,
      message: data.message,
      notificationType: data.notificationType,
      receiverUserId: data.receiverUserId,
      receiverRole: data.receiverRole,
      priority: resolvedPriority,
      // Convert null → undefined for Convex optional fields
      relatedEntityType: data.relatedEntityType ?? undefined,
      relatedEntityId: data.relatedEntityId ?? undefined,
      createdBy: data.createdBy ?? undefined,
      metadata: data.metadata ?? undefined,
    })
    .catch((error) => {
      console.error(
        "[publishNotification] Convex mutation error:",
        error
      );
    });
}
