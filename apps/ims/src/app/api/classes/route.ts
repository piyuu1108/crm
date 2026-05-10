import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  getAllClasses,
  createClass,
} from "@/lib/services/class.service";
import { classSchema } from "@/lib/validators";
import { safeParseInt } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = safeParseInt(request.nextUrl.searchParams.get("courseId"));
  const semester = safeParseInt(request.nextUrl.searchParams.get("semester"));
  const data = await getAllClasses(
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
    const parsed = classSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const c = await createClass(parsed.data);
    return Response.json(c, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Class name already exists" },
        { status: 409 }
      );
    }
    if (error?.message?.includes("Division number")) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Create class error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
