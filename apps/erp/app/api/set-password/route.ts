import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/app/lib/db";
import { students, faculty } from "@/app/lib/schema";
import { redis } from "@/app/lib/redis";
import { consumePasswordSetupToken } from "@/app/lib/password-setup-token";
import { AuditLogger } from "@/app/lib/audit-logger";

export async function POST(request: NextRequest) {
  const audit = AuditLogger.start(request, null, {
    action: "auth.set_password",
    category: "auth",
    summary: "User set/reset password",
  });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const token = (body.token ?? "").trim();
    const newPassword = body.newPassword ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!token) return audit.error("Token is required", undefined, 400);
    if (!newPassword) return audit.error("New password is required", undefined, 400);
    if (newPassword.length < 8) return audit.error("Password must be at least 8 characters", undefined, 400);
    if (!confirmPassword) return audit.error("Confirm password is required", undefined, 400);
    if (newPassword !== confirmPassword) return audit.error("Passwords do not match", undefined, 400);

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
