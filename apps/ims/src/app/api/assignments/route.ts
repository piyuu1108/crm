import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  createAssignment,
  deleteAssignmentByCell,
} from "@/lib/services/assignment.service";
import { assignmentSchema } from "@/lib/validators";
import { safeParseInt } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const a = await createAssignment(
      parsed.data.subjectId,
      parsed.data.classId,
      parsed.data.facultyId
    );
    return Response.json(a, { status: 201 });
  } catch (error: any) {
    console.error("Create assignment error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subjectId = safeParseInt(request.nextUrl.searchParams.get("subjectId"));
  const classId = safeParseInt(request.nextUrl.searchParams.get("classId"));

  if (subjectId === null || classId === null) {
    return Response.json(
      { error: "subjectId and classId must be valid integers" },
      { status: 400 }
    );
  }

  await deleteAssignmentByCell(subjectId, classId);
  return Response.json({ success: true });
}
