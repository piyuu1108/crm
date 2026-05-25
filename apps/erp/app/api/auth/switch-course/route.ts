import { NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth || !auth.isGlobal) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
    
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
