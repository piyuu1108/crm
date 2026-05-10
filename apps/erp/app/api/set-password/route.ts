import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/app/lib/db";
import { students, faculty } from "@/app/lib/schema";
import { redis } from "@/app/lib/redis";
import { consumePasswordSetupToken } from "@/app/lib/password-setup-token";

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const token = (body.token ?? "").trim();
    const newPassword = body.newPassword ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!token) return err("Token is required", 400);
    if (!newPassword) return err("New password is required", 400);
    if (newPassword.length < 8) return err("Password must be at least 8 characters", 400);
    if (!confirmPassword) return err("Confirm password is required", 400);
    if (newPassword !== confirmPassword) return err("Passwords do not match", 400);

    const tokenLookup = await consumePasswordSetupToken(token);
    if (!tokenLookup.userId || !tokenLookup.userType) {
      console.error("[set-password] Token lookup failed — token not found in Redis. Key:", tokenLookup.key);
      return err("Invalid or expired token", 400);
    }

    const { userId, userType } = tokenLookup;
    const table = userType === "student" ? students : faculty;

    const [user] = await db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, userId))
      .limit(1);

    if (!user) {
      console.error(`[set-password] User not found in DB — userType=${userType}, userId=${userId}`);
      await redis.del(tokenLookup.key);
      return err("Invalid token user", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(table)
      .set({ passwordHash })
      .where(eq(table.id, user.id));

    await redis.del(tokenLookup.key);

    return NextResponse.json(
      {
        success: true,
        data: { message: "Password set successfully" },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/set-password] Error:", error);
    return err("Internal server error", 500);
  }
}
