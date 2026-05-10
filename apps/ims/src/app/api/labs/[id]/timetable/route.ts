import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getRoomTimetableMatrix } from "@/lib/services/room.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await params;
    const id = parseInt(p.id, 10);
    const matrix = await getRoomTimetableMatrix(id);
    return Response.json(matrix);
  } catch (error) {
    console.error("Get lab timetable error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
