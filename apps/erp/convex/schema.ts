import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    notificationType: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.number()),
    createdBy: v.optional(v.number()),
    receiverUserId: v.number(),
    receiverRole: v.optional(v.string()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    isRead: v.boolean(),
    metadata: v.optional(v.any()),
  })
    .index("by_receiver", ["receiverUserId"])
    .index("by_receiver_unread", ["receiverUserId", "isRead"]),
});
