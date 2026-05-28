import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { initializeEmailJob, incrementEmailJobCounters } from "@/app/lib/email/job-tracker";
import { sendBulkPasswordEmails } from "@/app/lib/email/service";
import { AuditLogger } from "@/app/lib/audit-logger";

const BATCH_SIZE = 10;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 202 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "admin.email");
  if (auth instanceof NextResponse) return auth;

  const audit = AuditLogger.start(req, auth, {
    action: "faculty.send_password_email_bulk",
    category: "admin",
    summary: "Sent setup password emails to bulk faculty",
    entityType: "faculty",
  });

  try {
    const body = (await req.json().catch(() => ({}))) as { facultyDbIds?: number[] };
    const facultyDbIds = Array.isArray(body.facultyDbIds)
      ? body.facultyDbIds.map(Number).filter(Number.isFinite)
      : [];

    if (facultyDbIds.length === 0) return audit.error("facultyDbIds is required", undefined, 400);

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

    if (recipients.length === 0) return audit.error("No valid faculty members selected", undefined, 400);

    const jobId = randomUUID();

    await initializeEmailJob(jobId, recipients.length);

    // Send emails directly to Brevo and await response (No queues)
    const result = await sendBulkPasswordEmails(recipients);

    if (result.success) {
      await incrementEmailJobCounters(jobId, recipients.length, 0);
    } else {
      await incrementEmailJobCounters(jobId, 0, recipients.length, recipients.map((r) => r.email));
      return audit.error(result.error ?? "Failed to send bulk emails", undefined, 500);
    }

    return audit.success(
      NextResponse.json({
        success: true,
        data: {
          jobId,
          total: recipients.length,
          queuedBatches: 1,
          messageIds: [],
        }
      }, { status: 202 }),
      {
        recs: recipients.length,
        jobId,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
