import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { eq, ilike, and } from "drizzle-orm";

/**
 * GET /api/requests/faculty-search
 *
 * Searchable faculty dropdown for students creating a request.
 * Query params: ?q=search_term
 * Returns: { id, name, facultyCode, designation }
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

    // Any authenticated user can search faculty
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    const conditions = [eq(faculty.isActive, true)];
    if (query.length > 0) {
      conditions.push(ilike(faculty.name, `%${query}%`));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const results = await db
      .select({
        id: faculty.id,
        name: faculty.name,
        facultyCode: faculty.facultyCode,
        designation: faculty.designation,
      })
      .from(faculty)
      .where(whereClause)
      .limit(query ? 50 : 500);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("[GET /api/requests/faculty-search]", error);
    return NextResponse.json(
      { success: false, error: "Failed to search faculty" },
      { status: 500 }
    );
  }
}
