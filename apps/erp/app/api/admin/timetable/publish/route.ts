import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { divisions } from "@/app/lib/schema";
import { eq } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── PATCH /api/admin/timetable/publish ───────────────────────────────────────
// Toggle publish status for a division's timetable

export async function PATCH(req: NextRequest) {
  try {
    const payload = await authenticate();
    if (!payload) return err("Unauthorized", 401);

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.includes("hod") && !roles.includes("admin")) {
      return err("Forbidden", 403);
    }

    const body = await req.json();
    const { divisionId, status } = body;

    if (!divisionId || !status) {
      return err("divisionId and status are required", 400);
    }

    if (!["draft", "published"].includes(status)) {
      return err('status must be "draft" or "published"', 400);
    }

    const divId = Number(divisionId);
    if (isNaN(divId) || divId <= 0) return err("Invalid divisionId", 400);

    const [division] = await db
      .select({ id: divisions.id, publishStatus: divisions.publishStatus })
      .from(divisions)
      .where(eq(divisions.id, divId))
      .limit(1);

    if (!division) return err("Division not found", 404);

    await db
      .update(divisions)
      .set({ publishStatus: status })
      .where(eq(divisions.id, divId));

    return ok({ divisionId: divId, publishStatus: status });
  } catch (error) {
    console.error("[PATCH /api/admin/timetable/publish]", error);
    return err("Internal server error", 500);
  }
}
