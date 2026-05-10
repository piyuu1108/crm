import { NextRequest, NextResponse } from "next/server";
import { incrementEmailJobCounters } from "@/app/lib/email/job-tracker";
import { sendPasswordEmail, type PasswordEmailPayload } from "@/app/lib/email/service";

interface ProcessBody {
  jobId?: string;
  recipients?: PasswordEmailPayload[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ProcessBody;
    const jobId = body.jobId;
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];

    if (!jobId || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await sendPasswordEmail(recipient);
      if (result.success) sent += 1;
      else failed += 1;
    }

    await incrementEmailJobCounters(jobId, sent, failed);

    return NextResponse.json({ success: true, data: { sent, failed } }, { status: 200 });
  } catch (error) {
    console.error("[POST internal email job process] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
