import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { sendPasswordEmail } from "@/app/lib/email/service";
import { AuditLogger } from "@/app/lib/audit-logger";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "admin.email");
  if (auth instanceof NextResponse) return auth;

  const audit = AuditLogger.start(req, auth, {
    action: "faculty.send_password_email",
    category: "admin",
    summary: "Sent setup password email to faculty",
    entityType: "faculty",
  });

  try {
    const body = (await req.json().catch(() => ({}))) as { facultyDbId?: number };
    const facultyDbId = Number(body.facultyDbId);
    if (!Number.isFinite(facultyDbId)) return audit.error("facultyDbId is required", undefined, 400);

    const [member] = await db
      .select({
        id: faculty.id,
        facultyCode: faculty.facultyCode,
        name: faculty.name,
        email: faculty.email,
      })
      .from(faculty)
      .where(eq(faculty.id, facultyDbId))
      .limit(1);

    if (!member) return audit.error("Faculty member not found", undefined, 404);

    const result = await sendPasswordEmail({
      userId: member.id,
      userCode: member.facultyCode,
      fullName: member.name,
      email: member.email,
      userType: "faculty",
    });

    if (!result.success) {
      return audit.error(result.error ?? "Failed to send password email", undefined, 500);
    }

    return audit.success(
      NextResponse.json({ success: true, data: { sent: true } }, { status: 200 }),
      {
        eid: String(member.id),
        email: member.email,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
