import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
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
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
    });
  },
});

export const markAsRead = mutation({
  args: {
    ids: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { isRead: true });
    }
  },
});

export const markAllAsRead = mutation({
  args: {
    receiverUserId: v.number(),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_receiver_unread", (q) =>
        q
          .eq("receiverUserId", args.receiverUserId)
          .eq("isRead", false)
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listForUser = query({
  args: {
    receiverUserId: v.number(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_receiver", (q) =>
        q
          .eq("receiverUserId", args.receiverUserId)
      )
      .order("desc")
      .collect();

    const total = notifications.length;
    const unread = notifications.filter((n) => !n.isRead).length;
    const read = total - unread;
    const highPriority = notifications.filter(
      (n) => n.priority === "high"
    ).length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = notifications.filter(
      (n) => n._creationTime >= startOfToday.getTime()
    ).length;

    return {
      notifications,
      metrics: { total, unread, read, highPriority, today },
    };
  },
});

export const getUnreadCount = query({
  args: {
    receiverUserId: v.number(),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_receiver_unread", (q) =>
        q
          .eq("receiverUserId", args.receiverUserId)
          .eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const getRecentUnread = query({
  args: {
    receiverUserId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_receiver_unread", (q) =>
        q
          .eq("receiverUserId", args.receiverUserId)
          .eq("isRead", false)
      )
      .order("desc")
      .take(5);
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("notifications").collect();
    let deletedCount = 0;
    for (const doc of all) {
      await ctx.db.delete(doc._id);
      deletedCount++;
    }
    return { success: true, deletedCount };
  },
});
