import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { searchFaculty } from "@/lib/services/faculty.service";
import { getFacultyWorkload } from "@/lib/services/faculty.service";
import { getWorkloadLimit } from "@/lib/services/settings.service";
import { safeParseInt } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") || "";
  const courseId = safeParseInt(request.nextUrl.searchParams.get("courseId"));

  if (query.length < 1) {
    return Response.json([]);
  }

  const results = await searchFaculty(
    query,
    courseId ?? undefined
  );

  // Enrich with workload info
  const workloadLimit = await getWorkloadLimit();
  const enriched = await Promise.all(
    results.map(async (f) => {
      const wl = await getFacultyWorkload(f.id);
      return {
        ...f,
        totalLoad: wl.totalLoad,
        workloadLimit,
        assignments: wl.assignments,
      };
    })
  );

  return Response.json(enriched);
}
