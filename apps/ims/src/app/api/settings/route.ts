import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  getWorkloadLimit,
  setWorkloadLimit,
} from "@/lib/services/settings.service";
import { workloadSettingSchema } from "@/lib/validators";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const value = await getWorkloadLimit();
  return Response.json({ maxWeeklyWorkload: value });
}

export async function PUT(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = workloadSettingSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await setWorkloadLimit(parsed.data.value);
    return Response.json({ maxWeeklyWorkload: parsed.data.value });
  } catch (error) {
    console.error("Update workload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
