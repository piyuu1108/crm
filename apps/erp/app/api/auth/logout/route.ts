import { NextResponse, NextRequest } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { AuditLogger } from "@/app/lib/audit-logger";

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  const audit = AuditLogger.start(req, auth || { userId: 0, activeRole: "guest", roles: [], isGlobal: false } as any, {
    action: "auth.logout",
    category: "auth",
    summary: "User logged out",
  });

  const response = NextResponse.json({ success: true });
  // Clear the httpOnly auth cookie
  response.cookies.set({
    name: "auth_token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Expire immediately
    path: "/",
  });
  return audit.success(response);
}
