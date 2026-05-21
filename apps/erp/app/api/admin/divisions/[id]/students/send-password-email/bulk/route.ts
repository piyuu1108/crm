import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { students } from "@/app/lib/schema";
import { initializeEmailJob, incrementEmailJobCounters } from "@/app/lib/email/job-tracker";
import { sendBulkPasswordEmails } from "@/app/lib/email/service";

const BATCH_SIZE = 10;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 202 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorizeHod(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  if (!rolesArray.includes("hod")) return { error: err("Forbidden", 403) };

  return { payload };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeHod(req);
    if ("error" in auth && auth.error) return auth.error;

    const { id: idStr } = await params;
    const divisionId = Number.parseInt(idStr, 10);
    if (!Number.isFinite(divisionId)) return err("Invalid division ID", 400);

    const body = (await req.json().catch(() => ({}))) as { studentDbIds?: number[] };
    const studentDbIds = Array.isArray(body.studentDbIds)
      ? body.studentDbIds.map(Number).filter(Number.isFinite)
      : [];

    if (studentDbIds.length === 0) return err("studentDbIds is required", 400);

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

    if (recipients.length === 0) return err("No valid students selected", 400);

    const jobId = randomUUID();

    await initializeEmailJob(jobId, recipients.length);

    // Send emails directly to Brevo and await response (No queues)
    const result = await sendBulkPasswordEmails(recipients);

    if (result.success) {
      await incrementEmailJobCounters(jobId, recipients.length, 0);
    } else {
      await incrementEmailJobCounters(jobId, 0, recipients.length);
      console.error(`[POST admin bulk password email] Direct send failed:`, result.error);
      return err(result.error ?? "Failed to send bulk emails", 500);
    }

    return ok({
      jobId,
      total: recipients.length,
      queuedBatches: 1,
      messageIds: [],
    });
  } catch (error) {
    console.error("[POST admin bulk password email] Error:", error);
    return err("Internal server error", 500);
  }
}
