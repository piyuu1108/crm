import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { circulars } from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: invalid session" },
        { status: 401 }
      );
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.some((role) => role === "faculty" || role === "counselor" || role === "hod")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: faculty role required" },
        { status: 403 }
      );
    }

    const isHod = roles.includes("hod");

    // Retrieve circular to ensure it exists and we can delete it
    const [existing] = await db
      .select()
      .from(circulars)
      .where(eq(circulars.slug, slug));

    if (!existing) {
      return NextResponse.json({ success: false, error: "Circular not found" }, { status: 404 });
    }

    // Only allow HOD to delete ANY circular, faculty can only delete their own
    if (!isHod && existing.facultyId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You can only delete your own circulars" },
        { status: 403 }
      );
    }

    await db.delete(circulars).where(eq(circulars.slug, slug));

    return NextResponse.json({ success: true, data: "Deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/faculty/circulars/[slug]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete circular" },
      { status: 500 }
    );
  }
}
