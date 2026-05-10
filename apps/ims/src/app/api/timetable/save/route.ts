import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/db";
import { timetables } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { courseId, entries } = body;

    if (!courseId) {
      return Response.json({ error: "courseId is required" }, { status: 400 });
    }

    if (!Array.isArray(entries)) {
      return Response.json({ error: "entries must be an array" }, { status: 400 });
    }

    // Wrap in transaction for safety
    await db.transaction(async (tx) => {
      // 1. Delete all existing timetables for this course
      await tx.delete(timetables).where(eq(timetables.courseId, courseId));

      // 2. Insert new timetables (if any)
      if (entries.length > 0) {
        await tx.insert(timetables).values(entries.map((e: any) => ({
          courseId: Number(courseId),
          classId: Number(e.classId),
          day: String(e.day),
          slot: String(e.slot),
          assignmentId: Number(e.assignmentId),
          subjectId: Number(e.subjectId),
          facultyId: Number(e.facultyId),
          isLabSession: Boolean(e.isLabSession),
          labId: e.labId ? Number(e.labId) : null,
        })));
      }
    });

    return Response.json({ success: true, count: entries.length }, { status: 200 });
  } catch (error: any) {
    console.error("Save timetable error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
