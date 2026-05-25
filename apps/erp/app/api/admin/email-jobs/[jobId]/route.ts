import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { getEmailJobState } from "@/app/lib/email/job-tracker";

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const auth = await requirePermission(req, "admin.email");
    if (auth instanceof NextResponse) return auth;

    const { jobId } = await params;
    if (!jobId) return err("jobId is required", 400);

    const state = await getEmailJobState(jobId);
    if (!state) return err("Job not found", 404);

    return NextResponse.json({ success: true, data: state }, { status: 200 });
  } catch (error) {
    console.error("[GET admin email job status] Error:", error);
    return err("Internal server error", 500);
  }
}
