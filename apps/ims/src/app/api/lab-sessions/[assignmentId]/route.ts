import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { saveSessionsForAssignment } from "@/lib/services/lab-session.service";
import { saveLabSessionsSchema } from "@/lib/validators";
import { db } from "@/db";
import { assignments, subjects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await params;
    const assignmentId = parseInt(p.assignmentId, 10);
    if (isNaN(assignmentId)) {
      return Response.json({ error: "Invalid assignment ID" }, { status: 400 });
    }

    // Verify assignment exists and get subject credit
    const [assignment] = await db
      .select({
        id: assignments.id,
        subjectId: assignments.subjectId,
        credit: subjects.credit,
        subjectType: subjects.type,
      })
      .from(assignments)
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .where(eq(assignments.id, assignmentId))
      .limit(1);

    if (!assignment) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = saveLabSessionsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Validate total sessions match credits
    const totalSessions = parsed.data.sessions.length;
    if (totalSessions !== assignment.credit) {
      return Response.json(
        {
          error: `Session count (${totalSessions}) must equal subject credits (${assignment.credit})`,
        },
        { status: 400 }
      );
    }

    // Validate lab sessions have a room
    for (const session of parsed.data.sessions) {
      if (session.sessionType === "Lab" && !session.roomId) {
        return Response.json(
          { error: "Lab sessions require a room selection" },
          { status: 400 }
        );
      }
      if (session.sessionType === "Theory" && session.durationSlots !== 1) {
        return Response.json(
          { error: "Theory sessions must have duration of 1" },
          { status: 400 }
        );
      }
    }

    const result = await saveSessionsForAssignment(
      assignmentId,
      parsed.data.sessions
    );
    return Response.json(result);
  } catch (error) {
    console.error("Save lab sessions error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
