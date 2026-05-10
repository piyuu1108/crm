import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { sendPasswordEmail } from "@/app/lib/email/service";

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
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

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeHod();
    if ("error" in auth && auth.error) return auth.error;

    const body = (await req.json().catch(() => ({}))) as { facultyDbId?: number };
    const facultyDbId = Number(body.facultyDbId);
    if (!Number.isFinite(facultyDbId)) return err("facultyDbId is required", 400);

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

    if (!member) return err("Faculty member not found", 404);

    const result = await sendPasswordEmail({
      userId: member.id,
      userCode: member.facultyCode,
      fullName: member.name,
      email: member.email,
      userType: "faculty",
    });

    if (!result.success) {
      return err(result.error ?? "Failed to send password email", 500);
    }

    return ok({ sent: true });
  } catch (error) {
    console.error("[POST admin faculty password email] Error:", error);
    return err("Internal server error", 500);
  }
}
