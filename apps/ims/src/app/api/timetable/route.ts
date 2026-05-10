import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/db";
import { timetables } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    return Response.json({ error: "courseId is required" }, { status: 400 });
  }

  try {
    const data = await db
      .select()
      .from(timetables)
      .where(eq(timetables.courseId, Number(courseId)));

    return Response.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Fetch timetable error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
