import { NextResponse, NextRequest } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { AuditLogger } from "@/app/lib/audit-logger";

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth || !auth.isGlobal) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const audit = AuditLogger.start(request, auth, {
    action: "auth.switch_course",
    category: "auth",
    summary: "User switched active course context",
  });

  try {
    if (auth.isRoleForbidden) {
      return audit.error(`Forbidden: role '${auth.forbiddenRole}' is not assigned to this user`, undefined, 403);
    }

    const { courseId } = await request.json();
    
    const response = NextResponse.json({ success: true, activeCourseId: courseId });
    
    // Set the cookie
    response.cookies.set({
      name: "active_course_id",
      value: String(courseId),
      httpOnly: false, // Access from Client side components is required
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    
    return audit.success(response, { cid: String(courseId) });
  } catch (error: any) {
    return audit.error(error);
  }
}
