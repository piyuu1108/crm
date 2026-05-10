import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  updateSubject,
  deleteSubject,
} from "@/lib/services/subject.service";
import { subjectSchema } from "@/lib/validators";
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
    const parsed = subjectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const s = await updateSubject(numId, parsed.data);
    return Response.json(s);
  } catch (error: any) {
    if (error?.code === "23505") {
      return Response.json(
        { error: "Subject code already exists" },
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

  await deleteSubject(numId);
  return Response.json({ success: true });
}
