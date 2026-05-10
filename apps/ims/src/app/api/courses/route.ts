import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getAllCourses, createCourse } from "@/lib/services/settings.service";
import { courseSchema } from "@/lib/validators";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const courses = await getAllCourses();
  return Response.json(courses);
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const course = await createCourse(parsed.data.name);
    return Response.json(course, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Course name already exists" },
        { status: 409 }
      );
    }
    console.error("Create course error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
