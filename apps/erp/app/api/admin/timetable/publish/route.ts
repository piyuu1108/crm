import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { divisions } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}



// ─── PATCH /api/admin/timetable/publish ───────────────────────────────────────
// Toggle publish status for a division's timetable

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission(req, "timetable.publish");
  if (auth instanceof NextResponse) return auth;

  const audit = AuditLogger.start(req, auth, {
    action: "timetable.publish",
    category: "timetable",
    summary: "Published or drafted timetable for division",
    entityType: "division_timetable",
  });

  try {
    const body = await req.json();
    const { divisionId, status } = body;

    if (!divisionId || !status) {
      return audit.error("divisionId and status are required", undefined, 400);
    }

    if (!["draft", "published"].includes(status)) {
      return audit.error('status must be "draft" or "published"', undefined, 400);
    }

    const divId = Number(divisionId);
    if (isNaN(divId) || divId <= 0) return audit.error("Invalid divisionId", undefined, 400);

    const [division] = await db
      .select({ id: divisions.id, publishStatus: divisions.publishStatus })
      .from(divisions)
      .where(eq(divisions.id, divId))
      .limit(1);

    if (!division) return audit.error("Division not found", undefined, 404);

    await db
      .update(divisions)
      .set({ publishStatus: status })
      .where(eq(divisions.id, divId));

    return audit.success(
      NextResponse.json({ success: true, data: { divisionId: divId, publishStatus: status } }),
      {
        did: String(divId),
        st: status,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
