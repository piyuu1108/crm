import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { facultyRequestTypes } from "@/app/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "approvals.view");
    if (auth instanceof NextResponse) return auth;

    const types = await db
      .select({
        code: facultyRequestTypes.code,
        name: facultyRequestTypes.name,
        description: facultyRequestTypes.description,
      })
      .from(facultyRequestTypes)
      .where(eq(facultyRequestTypes.isActive, true));

    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    console.error("[GET /api/approvals/types] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
