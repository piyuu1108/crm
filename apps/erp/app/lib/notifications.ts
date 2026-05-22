import { EventEmitter } from "events";
import { db } from "./db";
import { notifications } from "./schema";

// Priority mapping configuration per notification type. Can be easily changed/extended.
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

export const notificationEvents = new EventEmitter();

// Handle notification insertion asynchronously to prevent blocking business requests
notificationEvents.on("create", async (data: {
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
}) => {
  try {
    // Resolve priority from configuration if not explicitly set
    const resolvedPriority = data.priority || NOTIFICATION_TYPE_PRIORITIES[data.notificationType] || "medium";

    await db.insert(notifications).values({
      title: data.title,
      message: data.message,
      notificationType: data.notificationType,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      createdBy: data.createdBy || null,
      receiverUserId: data.receiverUserId,
      receiverRole: data.receiverRole,
      priority: resolvedPriority,
      isRead: false,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  } catch (error) {
    console.error("[Notification Event Listener] Error writing notification to database:", error);
  }
});

/**
 * Publishes a notification by emitting a 'create' event.
 * Decouples database insertion from HTTP request handlers.
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
  notificationEvents.emit("create", data);
}
