import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { divisions } from "@/app/lib/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authenticate(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return null;
  return payload;
}

// ─── GET /api/admin/timetable/divisions ───────────────────────────────────────
// Returns all divisions for the timetable dropdown (no pagination)

export async function GET(req: NextRequest) {
  try {
    const payload = await authenticate(req);
    if (!payload) return err("Unauthorized", 401);

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.includes("hod") && !roles.includes("admin")) {
      return err("Forbidden", 403);
    }

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
