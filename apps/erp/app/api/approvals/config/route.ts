import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { facultyApprovalConfigs } from "@/app/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "approvals.create");
    if (auth instanceof NextResponse) return auth;

    const configs = await db
      .select({
        requestTypeCode: facultyApprovalConfigs.requestTypeCode,
        approvalChain: facultyApprovalConfigs.approvalChain,
      })
      .from(facultyApprovalConfigs)
      .where(eq(facultyApprovalConfigs.isActive, true));

    // Convert into a structured key-value mapping
    const configMap: Record<string, string[]> = {};
    configs.forEach((cfg) => {
      configMap[cfg.requestTypeCode] = cfg.approvalChain as string[];
    });

    return NextResponse.json({ success: true, data: configMap });
  } catch (error) {
    console.error("[GET /api/approvals/config] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
