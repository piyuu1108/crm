import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { updateRoom, deleteRoom } from "@/lib/services/room.service";
import { roomSchema } from "@/lib/validators";

export async function PUT(
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
    const body = await request.json();
    const parsed = roomSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const room = await updateRoom(id, parsed.data);
    return Response.json(room);
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Lab name already exists" },
        { status: 409 }
      );
    }
    console.error("Update lab error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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
    await deleteRoom(id);
    return Response.json({ success: true });
  } catch (error: any) {
    if (error?.code === "IN_USE") {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Delete lab error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
