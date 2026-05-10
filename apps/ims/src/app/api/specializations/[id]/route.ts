import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  updateSpecialization,
  deleteSpecialization,
} from "@/lib/services/settings.service";
import { safeParseInt, invalidIdResponse } from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numId = safeParseInt(id);
    if (numId === null) return invalidIdResponse();

    const body = await request.json();
    const spec = await updateSpecialization(numId, body);
    return Response.json(spec);
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Short code already exists" },
        { status: 409 }
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = safeParseInt(id);
  if (numId === null) return invalidIdResponse();

  await deleteSpecialization(numId);
  return Response.json({ success: true });
}
