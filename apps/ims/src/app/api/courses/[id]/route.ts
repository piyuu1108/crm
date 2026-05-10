import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  updateCourse,
  deleteCourse,
} from "@/lib/services/settings.service";
import { courseSchema } from "@/lib/validators";
import { safeParseInt, invalidIdResponse } from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numId = safeParseInt(id);
    if (numId === null) return invalidIdResponse();

    const body = await request.json();
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const course = await updateCourse(numId, parsed.data.name);
    return Response.json(course);
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Course name already exists" },
        { status: 409 }
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = safeParseInt(id);
  if (numId === null) return invalidIdResponse();

  await deleteCourse(numId);
  return Response.json({ success: true });
}
