import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getSessionsByAssignment, getSessionsByClass } from "@/lib/services/lab-session.service";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");
    const classId = searchParams.get("classId");

    if (assignmentId) {
      const sessions = await getSessionsByAssignment(parseInt(assignmentId, 10));
      return Response.json(sessions);
    }

    if (classId) {
      const sessions = await getSessionsByClass(parseInt(classId, 10));
      return Response.json(sessions);
    }

    return Response.json(
      { error: "Either assignmentId or classId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Get lab sessions error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
