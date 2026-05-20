import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { counselorDivisionAssignments, divisions, students } from "@/app/lib/schema";
import { initializeEmailJob } from "@/app/lib/email/job-tracker";
import { publishToQstash } from "@/app/lib/qstash";

const BATCH_SIZE = 10;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 202 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function authorize(req: NextRequest, divisionId: number) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  if (!rolesArray.includes("counselor")) return { error: err("Forbidden", 403) };

  // Verify assignment — scoped to the division's current semester
  const [assignment] = await db
    .select({ id: counselorDivisionAssignments.id })
    .from(counselorDivisionAssignments)
    .innerJoin(divisions, and(
      eq(counselorDivisionAssignments.divisionId, divisions.id),
      eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
    ))
    .where(
      and(
        eq(counselorDivisionAssignments.facultyId, payload.userId),
        eq(counselorDivisionAssignments.divisionId, divisionId)
      )
    )
    .limit(1);

  if (!assignment) return { error: err("Forbidden", 403) };
  return { payload };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const divisionId = Number.parseInt(idStr, 10);
    if (!Number.isFinite(divisionId)) return err("Invalid division ID", 400);

    const auth = await authorize(req, divisionId);
    if ("error" in auth && auth.error) return auth.error;

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
        studentDbId: student.id,
        studentId: student.studentId as string,
        fullName: student.fullName,
        email: student.email,
      }));

    if (recipients.length === 0) {
      return err("No valid students selected", 400);
    }

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
    console.error("[POST counselor bulk password email] Error:", error);
    return err("Internal server error", 500);
  }
}
