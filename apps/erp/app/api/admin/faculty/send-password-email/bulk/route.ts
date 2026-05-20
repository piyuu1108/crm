import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { initializeEmailJob } from "@/app/lib/email/job-tracker";
import { publishToQstash } from "@/app/lib/qstash";

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

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeHod(req);
    if ("error" in auth && auth.error) return auth.error;

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
    console.error("[POST admin bulk faculty password email] Error:", error);
    return err("Internal server error", 500);
  }
}
