import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getAllRooms, createRoom } from "@/lib/services/room.service";
import { roomSchema } from "@/lib/validators";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAllRooms();
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = roomSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const room = await createRoom(parsed.data);
    return Response.json(room, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Lab name already exists" },
        { status: 409 }
      );
    }
    console.error("Create lab error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
