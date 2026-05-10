import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { students } from "@/app/lib/schema";
import { initializeEmailJob } from "@/app/lib/email/job-tracker";
import { publishToQstash } from "@/app/lib/qstash";

const BATCH_SIZE = 10;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 202 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorizeHod() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("hod")) return { error: err("Forbidden", 403) };

  return { payload };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeHod();
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

    const protocol = req.headers.get("x-forwarded-proto") ?? "http";
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!host) return err("Missing host header", 500);

    const processUrl = `${protocol}://${host}/api/internal/email-jobs/process`;
    const jobId = randomUUID();

    await initializeEmailJob(jobId, recipients.length);

    const batches: typeof recipients[] = [];
    for (let idx = 0; idx < recipients.length; idx += BATCH_SIZE) {
      batches.push(recipients.slice(idx, idx + BATCH_SIZE));
    }

    const publishResponses = await Promise.all(
      batches.map((batch, batchIndex) =>
        publishToQstash(processUrl, {
          jobId,
          batchIndex,
          totalBatches: batches.length,
          recipients: batch,
        })
      )
    );

    return ok({
      jobId,
      total: recipients.length,
      queuedBatches: batches.length,
      messageIds: publishResponses.map((resp) => resp.messageId).filter(Boolean),
    });
  } catch (error) {
    console.error("[POST admin bulk password email] Error:", error);
    return err("Internal server error", 500);
  }
}
