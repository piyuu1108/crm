import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  getAllFaculty,
  createFaculty,
} from "@/lib/services/faculty.service";
import { facultySchema } from "@/lib/validators";
import { safeParseInt } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = safeParseInt(request.nextUrl.searchParams.get("courseId"));
  const data = await getAllFaculty(courseId ?? undefined);
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = facultySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const f = await createFaculty(
      parsed.data.name,
      parsed.data.code,
      parsed.data.courseId
    );
    return Response.json(f, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Faculty code already exists" },
        { status: 409 }
      );
    }
    console.error("Create faculty error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
