import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getGenerationData } from "@/lib/services/generation.service";
import { safeParseInt } from "@/lib/api-utils";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * GET /api/timetable/generation-data?courseId=1
 * GET /api/timetable/generation-data?course=BCA
 *
 * Returns the complete, normalized scheduling payload for client-side
 * timetable generation. After this response, the engine needs ZERO
 * additional database calls.
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept either courseId (number) or course (name, case-insensitive)
  let courseId = safeParseInt(
    request.nextUrl.searchParams.get("courseId")
  );

  const courseName = request.nextUrl.searchParams.get("course");

  if (courseId === null && courseName) {
    const [found] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(sql`LOWER(${courses.name}) = LOWER(${courseName})`)
      .limit(1);

    if (!found) {
      return Response.json(
        { error: `Course "${courseName}" not found` },
        { status: 404 }
      );
    }
    courseId = found.id;
  }

  if (courseId === null) {
    return Response.json(
      { error: "courseId or course query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const payload = await getGenerationData(courseId);
    return Response.json(payload);
  } catch (error: any) {
    console.error("Generation data error:", error);
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

