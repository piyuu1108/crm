import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getAssignmentMatrix } from "@/lib/services/assignment.service";
import { safeParseInt } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = safeParseInt(request.nextUrl.searchParams.get("courseId"));
  const semesterParam = request.nextUrl.searchParams.get("semester");
  const semester = semesterParam === "all" ? "all" : safeParseInt(semesterParam);

  if (courseId === null || semester === null) {
    return Response.json(
      { error: "courseId and semester must be valid" },
      { status: 400 }
    );
  }

  const matrix = await getAssignmentMatrix(courseId, semester);
  return Response.json(matrix);
}
