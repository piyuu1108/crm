import { NextRequest, NextResponse } from "next/server";
import { incrementEmailJobCounters } from "@/app/lib/email/job-tracker";
import { sendPasswordEmail, type PasswordEmailPayload } from "@/app/lib/email/service";
import { AuditLogger } from "@/app/lib/audit-logger";

interface ProcessBody {
  jobId?: string;
  recipients?: PasswordEmailPayload[];
}

export async function POST(req: NextRequest) {
  const audit = AuditLogger.start(req, { userId: 0, activeRole: "system", isGlobal: true } as any, {
    action: "email_jobs.process",
    category: "internal",
    summary: "Processed email batch job",
  });

  try {
    const body = (await req.json().catch(() => ({}))) as ProcessBody;
    const jobId = body.jobId;
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];

    if (!jobId || recipients.length === 0) {
      return audit.error("Invalid payload", NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 }));
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await sendPasswordEmail(recipient);
      if (result.success) sent += 1;
      else failed += 1;
    }

    await incrementEmailJobCounters(jobId, sent, failed);

    return audit.success(NextResponse.json({ success: true, data: { sent, failed } }, { status: 200 }), { sent, failed });
  } catch (error) {
    return audit.error(error);
  }
}
