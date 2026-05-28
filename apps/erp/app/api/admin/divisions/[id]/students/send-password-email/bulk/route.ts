import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { students } from "@/app/lib/schema";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "admin.email");
  if (auth instanceof NextResponse) return auth;

  const { id: idStr } = await params;
  const divisionId = Number.parseInt(idStr, 10);

  const audit = AuditLogger.start(req, auth, {
    action: "student.send_password_email_bulk",
    category: "admin",
    summary: "Sent setup password emails to bulk students",
    entityType: "student",
  });

  try {
    if (!Number.isFinite(divisionId)) return audit.error("Invalid division ID", undefined, 400);

    const body = (await req.json().catch(() => ({}))) as { studentDbIds?: number[] };
    const studentDbIds = Array.isArray(body.studentDbIds)
      ? body.studentDbIds.map(Number).filter(Number.isFinite)
      : [];

    if (studentDbIds.length === 0) return audit.error("studentDbIds is required", undefined, 400);

    const selectedStudents = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        fullName: students.fullName,
        email: students.email,
      })
      .from(students)
      .where(
        and(
          inArray(students.id, studentDbIds),
          eq(students.currentDivisionId, divisionId)
        )
      );

    const recipients = selectedStudents
      .filter((student) => Boolean(student.studentId))
      .map((student) => ({
        userId: student.id,
        userCode: student.studentId as string,
        fullName: student.fullName,
        email: student.email,
        userType: "student" as const,
      }));

    if (recipients.length === 0) return audit.error("No valid students selected", undefined, 400);

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
        did: String(divisionId),
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
