import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { courses } from "@/app/lib/schema";
import { getAuthContext } from "@/app/lib/api-auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth || !auth.isGlobal) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.isRoleForbidden) {
      return NextResponse.json({ success: false, error: `Forbidden: role '${auth.forbiddenRole}' is not assigned to this user` }, { status: 403 });
    }

    const courseList = await db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
      })
      .from(courses);

    return NextResponse.json({ success: true, data: courseList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
