import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { divisions } from "@/app/lib/schema";
import { asc } from "drizzle-orm";

/**
 * GET /api/circulars/divisions
 *
 * Lightweight endpoint that returns all divisions for the circular
 * "Specific Division(s)" target selector. Any user who can create
 * circulars can access this.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await requirePermission(req, "circulars.create");
    if (result instanceof NextResponse) return result;

    const rows = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        semesterNo: divisions.semesterNo,
        courseCode: divisions.courseCode,
        batchYear: divisions.batchYear,
      })
      .from(divisions)
      .orderBy(asc(divisions.semesterNo), asc(divisions.displayName));

    return NextResponse.json({ success: true, data: { divisions: rows } });
  } catch (error) {
    console.error("[GET /api/circulars/divisions]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch divisions" },
      { status: 500 }
    );
  }
}
