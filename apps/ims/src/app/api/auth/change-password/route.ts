import { NextRequest } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getCurrentAdmin,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { oldPassword, newPassword } = parsed.data;

    // Get full admin with password hash
    const [fullAdmin] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, admin.id))
      .limit(1);

    const valid = await verifyPassword(oldPassword, fullAdmin.passwordHash);
    if (!valid) {
      return Response.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(admins)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(admins.id, admin.id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
