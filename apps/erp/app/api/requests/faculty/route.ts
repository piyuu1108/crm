import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { studentRequests } from "@/app/lib/schema";
import { eq, and, desc, count } from "drizzle-orm";

/**
 * GET /api/requests/faculty
 *
 * Returns paginated list of requests assigned to the authenticated faculty.
 * Query params: ?status=pending|approved|rejected  &limit=  &offset=
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: invalid session" },
        { status: 401 }
      );
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.includes("faculty") && !roles.includes("hod") && !roles.includes("counselor")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: faculty role required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build conditions
    const conditions = [eq(studentRequests.targetFacultyId, payload.userId)];
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      conditions.push(eq(studentRequests.status, status));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const results = await db
      .select()
      .from(studentRequests)
      .where(whereClause)
      .orderBy(desc(studentRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ totalCount }] = await db
      .select({ totalCount: count(studentRequests.id) })
      .from(studentRequests)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        total: Number(totalCount),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[GET /api/requests/faculty]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch faculty requests" },
      { status: 500 }
    );
  }
}
