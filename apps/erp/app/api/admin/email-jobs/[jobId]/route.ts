import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { getEmailJobState } from "@/app/lib/email/job-tracker";

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (!rolesArray.includes("hod")) return err("Forbidden", 403);

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
