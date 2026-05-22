import { NextRequest, NextResponse } from "next/server";
import { and, or, eq, inArray, desc, count, sql, gte, like } from "drizzle-orm";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { notifications, faculty, students } from "@/app/lib/schema";
import { publishNotification } from "@/app/lib/notifications";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/notifications
 * Retrieves a list of notifications for the authenticated user and active role.
 * Query Parameters:
 *   - isRead?: 'true' | 'false'
 *   - priority?: 'low' | 'medium' | 'high'
 *   - notificationType?: string
 *   - search?: string (matches title or message)
 *   - dateRange?: 'today' | 'week' | 'month'
 *   - limit?: number (default: 10)
 *   - offset?: number (default: 0)
 *
 * Returns: { notifications: [], pagination: {}, metrics: {} }
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const activeRole = req.headers.get("X-Active-Role") ?? payload.roles[0];
    const userId = payload.userId;

    const { searchParams } = new URL(req.url);
    const isReadParam = searchParams.get("isRead");
    const priorityParam = searchParams.get("priority");
    const typeParam = searchParams.get("notificationType");
    const searchParam = searchParams.get("search");
    const dateRangeParam = searchParams.get("dateRange");
    
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    // ── Build Base Conditions ──────────────────────────────────────────
    const conditions = [
      eq(notifications.receiverUserId, userId),
      eq(notifications.receiverRole, activeRole),
    ];

    if (isReadParam === "true" || isReadParam === "false") {
      conditions.push(eq(notifications.isRead, isReadParam === "true"));
    }

    if (priorityParam) {
      conditions.push(eq(notifications.priority, priorityParam));
    }

    if (typeParam) {
      conditions.push(eq(notifications.notificationType, typeParam));
    }

    if (searchParam && searchParam.trim()) {
      const searchPattern = `%${searchParam.trim()}%`;
      conditions.push(
        sql`(${like(notifications.title, searchPattern)} OR ${like(notifications.message, searchPattern)})`
      );
    }

    if (dateRangeParam) {
      const now = new Date();
      if (dateRangeParam === "today") {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        conditions.push(gte(notifications.createdAt, startOfToday));
      } else if (dateRangeParam === "week") {
        // Start of current week (Sunday)
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        conditions.push(gte(notifications.createdAt, startOfWeek));
      } else if (dateRangeParam === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        conditions.push(gte(notifications.createdAt, startOfMonth));
      }
    }

    const whereClause = and(...conditions);

    // ── Fetch Notifications ────────────────────────────────────────────
    const rows = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // ── Fetch Aggregated Metrics in Parallel ───────────────────────────
    const baseMetricConditions = [
      eq(notifications.receiverUserId, userId),
      eq(notifications.receiverRole, activeRole),
    ];

    const todayDate = new Date();
    const startOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

    const [
      [totalResult],
      [unreadResult],
      [readResult],
      [highPriorityResult],
      [todayResult]
    ] = await Promise.all([
      db.select({ count: count() }).from(notifications).where(and(...baseMetricConditions)),
      db.select({ count: count() }).from(notifications).where(and(...baseMetricConditions, eq(notifications.isRead, false))),
      db.select({ count: count() }).from(notifications).where(and(...baseMetricConditions, eq(notifications.isRead, true))),
      db.select({ count: count() }).from(notifications).where(and(...baseMetricConditions, eq(notifications.priority, "high"))),
      db.select({ count: count() }).from(notifications).where(and(...baseMetricConditions, gte(notifications.createdAt, startOfToday))),
    ]);

    const total = Number(totalResult?.count || 0);
    const unread = Number(unreadResult?.count || 0);
    const read = Number(readResult?.count || 0);
    const highPriority = Number(highPriorityResult?.count || 0);
    const today = Number(todayResult?.count || 0);

    return ok({
      notifications: rows,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        total,
        unread,
        read,
        highPriority,
        today,
        recentActivitySummary: unread > 0 ? `You have ${unread} unread notifications.` : "No new notifications.",
      }
    });
  } catch (error) {
    console.error("[GET /api/notifications] Error:", error);
    return err("Internal server error", 500);
  }
}

/**
 * PATCH /api/notifications
 * Marks notifications as read.
 * Body Parameters:
 *   - ids?: number[] (list of notification IDs to mark as read)
 *   - all?: boolean (marks all notifications for the user + active role as read)
 */
export async function PATCH(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const activeRole = req.headers.get("X-Active-Role") ?? payload.roles[0];
    const userId = payload.userId;

    const body = await req.json().catch(() => ({}));
    const { ids, all } = body;

    if (all === true) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.receiverUserId, userId),
            eq(notifications.receiverRole, activeRole),
            eq(notifications.isRead, false)
          )
        );
      return ok({ message: "All notifications marked as read" });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      // Security check: ensure they only mark notifications belonging to them
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.receiverUserId, userId),
            eq(notifications.receiverRole, activeRole),
            inArray(notifications.id, ids)
          )
        );
      return ok({ message: `${ids.length} notifications marked as read` });
    }

    return err("Invalid request payload. Provide 'ids' or set 'all: true'", 400);
  } catch (error) {
    console.error("[PATCH /api/notifications] Error:", error);
    return err("Internal server error", 500);
  }
}

/**
 * POST /api/notifications
 * Allows sending/simulating notifications (e.g. for fee events, assignment updates, admin updates).
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    // Limit creation to faculty/admin/counselor roles for security (simulation page or automated tasks)
    const creatorRoles = payload.roles;
    const isAuthorized = creatorRoles.some(r => ["faculty", "counselor", "hod", "admin"].includes(r));
    if (!isAuthorized) return err("Forbidden", 403);

    const body = await req.json().catch((e) => {
      console.error("[POST /api/notifications] JSON parsing error:", e);
      return {};
    });
    console.log("[POST /api/notifications] Parsed body:", body);
    const {
      title,
      message,
      notificationType,
      receiverUserId,
      priority,
      relatedEntityType,
      relatedEntityId,
      metadata
    } = body;

    if (!title || !message || !notificationType || !receiverUserId) {
      return err("Missing required parameters: title, message, notificationType, receiverUserId", 400);
    }

    let finalReceiverUserId: number | null = null;
    let finalReceiverRole: string | null = null;
    const identifier = String(receiverUserId).trim();
    const parsedId = Number(identifier);

    // 1. Try to search students table by studentId, tempId, email, or direct numeric ID
    const studentConditions = [
      eq(students.studentId, identifier),
      eq(students.tempId, identifier),
      eq(students.email, identifier)
    ];
    if (!isNaN(parsedId) && parsedId > 0 && String(parsedId) === identifier) {
      studentConditions.push(eq(students.id, parsedId));
    }

    const matchedStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(or(...studentConditions))
      .limit(1);

    if (matchedStudents.length > 0) {
      finalReceiverUserId = matchedStudents[0].id;
      finalReceiverRole = "student";
    } else {
      // 2. If not found in students, try to search faculty table by facultyCode, email, or direct numeric ID
      const facultyConditions = [
        eq(faculty.facultyCode, identifier),
        eq(faculty.email, identifier)
      ];
      if (!isNaN(parsedId) && parsedId > 0 && String(parsedId) === identifier) {
        facultyConditions.push(eq(faculty.id, parsedId));
      }

      const matchedFaculty = await db
        .select({ id: faculty.id })
        .from(faculty)
        .where(or(...facultyConditions))
        .limit(1);

      if (matchedFaculty.length > 0) {
        finalReceiverUserId = matchedFaculty[0].id;

        // Query faculty roles via junction table
        const { facultyRoles, roles } = await import("@/app/lib/schema");
        const userRolesRaw = await db
          .select({ name: roles.name })
          .from(facultyRoles)
          .innerJoin(roles, eq(facultyRoles.roleId, roles.id))
          .where(eq(facultyRoles.facultyId, finalReceiverUserId));

        const userRolesList = userRolesRaw.map((r) => r.name);

        if (userRolesList.includes("faculty")) {
          finalReceiverRole = "faculty";
        } else if (userRolesList.length > 0) {
          finalReceiverRole = userRolesList[0];
        } else {
          finalReceiverRole = "faculty";
        }
      }
    }

    if (!finalReceiverUserId || !finalReceiverRole) {
      return err(`Recipient user not found matching identifier '${identifier}'`, 404);
    }

    publishNotification({
      title: title.trim(),
      message: message.trim(),
      notificationType: notificationType.trim(),
      receiverUserId: finalReceiverUserId,
      receiverRole: finalReceiverRole,
      priority,
      createdBy: payload.userId,
      relatedEntityType,
      relatedEntityId: relatedEntityId ? Number(relatedEntityId) : undefined,
      metadata,
    });

    return NextResponse.json({ success: true, message: "Notification event published successfully" }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/notifications] Error:", error);
    return err("Internal server error", 500);
  }
}
