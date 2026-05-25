import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { initializeEmailJob, incrementEmailJobCounters } from "@/app/lib/email/job-tracker";
import { sendBulkPasswordEmails } from "@/app/lib/email/service";

const BATCH_SIZE = 10;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 202 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "admin.email");
    if (auth instanceof NextResponse) return auth;

    const body = (await req.json().catch(() => ({}))) as { facultyDbIds?: number[] };
    const facultyDbIds = Array.isArray(body.facultyDbIds)
      ? body.facultyDbIds.map(Number).filter(Number.isFinite)
      : [];

    if (facultyDbIds.length === 0) return err("facultyDbIds is required", 400);

    const selectedFaculty = await db
      .select({
        id: faculty.id,
        facultyCode: faculty.facultyCode,
        name: faculty.name,
        email: faculty.email,
      })
      .from(faculty)
      .where(inArray(faculty.id, facultyDbIds));

    const recipients = selectedFaculty.map((member) => ({
      userId: member.id,
      userCode: member.facultyCode,
      fullName: member.name,
      email: member.email,
      userType: "faculty" as const,
    }));

    if (recipients.length === 0) return err("No valid faculty members selected", 400);

    const jobId = randomUUID();

    await initializeEmailJob(jobId, recipients.length);

    // Send emails directly to Brevo and await response (No queues)
    const result = await sendBulkPasswordEmails(recipients);

    if (result.success) {
      await incrementEmailJobCounters(jobId, recipients.length, 0);
    } else {
      await incrementEmailJobCounters(jobId, 0, recipients.length, recipients.map((r) => r.email));
      console.error(`[POST admin bulk faculty password email] Direct send failed:`, result.error);
      return err(result.error ?? "Failed to send bulk emails", 500);
    }

    return ok({
      jobId,
      total: recipients.length,
      queuedBatches: 1,
      messageIds: [],
    });
  } catch (error) {
    console.error("[POST admin bulk faculty password email] Error:", error);
    return err("Internal server error", 500);
  }
}
