import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  getAllSpecializations,
  createSpecialization,
} from "@/lib/services/settings.service";
import { specializationSchema } from "@/lib/validators";
import { safeParseInt } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = safeParseInt(request.nextUrl.searchParams.get("courseId"));
  const specs = await getAllSpecializations(courseId ?? undefined);
  return Response.json(specs);
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = specializationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const spec = await createSpecialization(
      parsed.data.name,
      parsed.data.shortCode,
      parsed.data.courseId
    );
    return Response.json(spec, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Short code already exists" },
        { status: 409 }
      );
    }
    console.error("Create specialization error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
