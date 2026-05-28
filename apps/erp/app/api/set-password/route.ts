import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/app/lib/db";
import { students, faculty } from "@/app/lib/schema";
import { redis } from "@/app/lib/redis";
import { consumePasswordSetupToken } from "@/app/lib/password-setup-token";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { SetPasswordSchema } from "@/app/lib/validations/schemas/auth";

export async function POST(request: NextRequest) {
  const audit = AuditLogger.start(request, null, {
    action: "auth.set_password",
    category: "auth",
    summary: "User set/reset password",
  });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = validateBody(body, SetPasswordSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { token, newPassword } = parsed.data;

    const tokenLookup = await consumePasswordSetupToken(token);
    if (!tokenLookup.userId || !tokenLookup.userType) {
      const reason = tokenLookup.reason === "malformed"
        ? "Invalid token format"
        : "Token has expired or has already been used";
      return audit.error(reason, undefined, 400);
    }

    const { userId, userType } = tokenLookup;
    const table = userType === "student" ? students : faculty;

    const [user] = await db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, userId))
      .limit(1);

    if (!user) {
      await redis.del(tokenLookup.key);
      return audit.error("Invalid token user", undefined, 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(table)
      .set({ passwordHash })
      .where(eq(table.id, user.id));

    await redis.del(tokenLookup.key);

    return audit.success(
      NextResponse.json(
        {
          success: true,
          data: { message: "Password set successfully" },
        },
        { status: 200 }
      ),
      {
        uid: String(user.id),
        utyp: userType,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
