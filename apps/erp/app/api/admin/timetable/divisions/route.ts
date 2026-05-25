import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { divisions } from "@/app/lib/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}


// ─── GET /api/admin/timetable/divisions ───────────────────────────────────────
// Returns all divisions for the timetable dropdown (no pagination)

export async function GET(req: NextRequest) {
  try {
    const result = await requirePermission(req, "timetable.manage");
    if (result instanceof NextResponse) return result;

    const allDivisions = await db
      .select({
        id: divisions.id,
        displayName: divisions.displayName,
        specialization: divisions.specialization,
        semesterNo: divisions.semesterNo,
        batchYear: divisions.batchYear,
        publishStatus: divisions.publishStatus,
      })
      .from(divisions);

    return ok(allDivisions);
  } catch (error) {
    console.error("[GET /api/admin/timetable/divisions]", error);
    return err("Internal server error", 500);
  }
}
