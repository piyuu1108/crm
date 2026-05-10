import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  getAllSubjects,
  createSubject,
} from "@/lib/services/subject.service";
import { subjectSchema } from "@/lib/validators";
import { safeParseInt } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = safeParseInt(request.nextUrl.searchParams.get("courseId"));
  const semester = safeParseInt(request.nextUrl.searchParams.get("semester"));
  const data = await getAllSubjects(
    courseId ?? undefined,
    semester ?? undefined
  );
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = subjectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const s = await createSubject(parsed.data);
    return Response.json(s, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Subject code already exists" },
        { status: 409 }
      );
    }
    console.error("Create subject error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
