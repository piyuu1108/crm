import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getGenerationData } from "@/lib/services/generation.service";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/timetable/load-best?courseId=1
 *
 * Reads the pre-saved best.json and returns it along with
 * payload metadata for client-side mapping.
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = parseInt(request.nextUrl.searchParams.get("courseId") || "", 10);
  if (isNaN(courseId)) {
    return Response.json({ error: "courseId is required" }, { status: 400 });
  }

  try {
    // Read the best.json file
    const bestPath = join(process.cwd(), "best.json");
    const bestJson = readFileSync(bestPath, "utf-8");
    const aiResult = JSON.parse(bestJson);

    // Get payload metadata for client-side ID→name mapping
    const payload = await getGenerationData(courseId);

    return Response.json({
      aiResult,
      payload: {
        metadata: payload.metadata,
        classes: payload.classes,
        subjects: payload.subjects,
        faculties: payload.faculties,
        rooms: payload.rooms,
        assignments: payload.assignments,
        labSessions: payload.labSessions,
      },
    });
  } catch (error: any) {
    console.error("Load best error:", error);
    return Response.json(
      { error: error?.message || "Failed to load best.json" },
      { status: 500 }
    );
  }
}
