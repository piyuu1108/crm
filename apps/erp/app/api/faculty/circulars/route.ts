import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { circulars, faculty } from "@/app/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    const { 
      title, 
      description, 
      attachmentUrl, 
      attachmentType, 
      attachmentSize, 
      targetType, 
      targetYear, 
      targetDivisionId 
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    if (!["ALL", "YEAR", "DIVISION"].includes(targetType)) {
      return NextResponse.json({ success: false, error: "Invalid target type" }, { status: 400 });
    }

    // Get Faculty Name
    const [facultyData] = await db
      .select({ name: faculty.name })
      .from(faculty)
      .where(eq(faculty.id, payload.userId));

    if (!facultyData) {
      return NextResponse.json({ success: false, error: "Faculty not found" }, { status: 404 });
    }

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const randomHash = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${randomHash}`;

    const [newCircular] = await db.insert(circulars).values({
      slug,
      title,
      description,
      attachmentUrl,
      attachmentType,
      attachmentSize,
      targetType,
      targetYear: targetType === "YEAR" ? targetYear : null,
      targetDivisionId: targetType === "DIVISION" ? targetDivisionId : null,
      facultyId: payload.userId,
      facultyName: facultyData.name,
    }).returning();

    return NextResponse.json({ success: true, data: newCircular });
  } catch (error) {
    console.error("[POST /api/faculty/circulars]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create circular" },
      { status: 500 }
    );
  }
}
