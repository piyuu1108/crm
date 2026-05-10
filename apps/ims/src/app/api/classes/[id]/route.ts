import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { deleteClass } from "@/lib/services/class.service";
import { safeParseInt, invalidIdResponse } from "@/lib/api-utils";

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

  await deleteClass(numId);
  return Response.json({ success: true });
}
