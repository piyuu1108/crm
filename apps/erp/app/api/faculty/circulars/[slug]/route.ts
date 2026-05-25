import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/app/lib/api-auth";
import { hasPermission } from "@/app/lib/permissions";
import { db } from "@/app/lib/db";
import { circulars, circularRecipients } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { cacheTags, clearCache } from "@/app/lib/cache";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await requireAnyPermission(req, ["circulars.delete_own", "circulars.delete_any"]);
    if (auth instanceof NextResponse) return auth;

    // Retrieve circular to ensure it exists and we can delete it
    const [existing] = await db
      .select()
      .from(circulars)
      .where(eq(circulars.slug, slug));

    if (!existing) {
      return NextResponse.json({ success: false, error: "Circular not found" }, { status: 404 });
    }

    // Only allow delete_any (HOD+) to delete ANY circular; others can only delete their own
    const canDeleteAny = hasPermission(auth.activeRole, "circulars.delete_any");
    if (!canDeleteAny && existing.facultyId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You can only delete your own circulars" },
        { status: 403 }
      );
    }

    // Retrieve recipient division IDs if division-targeted
    let divisionIds: number[] = [];
    if (existing.targetType === "DIVISION") {
      const recs = await db
        .select({ divisionId: circularRecipients.divisionId })
        .from(circularRecipients)
        .where(eq(circularRecipients.circularId, existing.id));
      divisionIds = recs.map((r) => r.divisionId);
    }

    await db.delete(circulars).where(eq(circulars.slug, slug));

    // Invalidate cached circular lists
    try {
      const targetType = existing.targetType;
      if (targetType === "ALL") {
        await clearCache(cacheTags.circulars.global());
      } else if (targetType === "FACULTY") {
        await clearCache(cacheTags.circulars.faculty());
      } else if (targetType === "YEAR" && existing.targetYear) {
        await clearCache(cacheTags.circulars.year(existing.targetYear));
      } else if (targetType === "DIVISION" && divisionIds) {
        for (const divId of divisionIds) {
          await clearCache(cacheTags.circulars.division(divId));
        }
      }
    } catch (cacheError) {
      console.warn("[Cache Error] Failed to invalidate circular cache:", cacheError);
    }

    return NextResponse.json({ success: true, data: "Deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/faculty/circulars/[slug]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete circular" },
      { status: 500 }
    );
  }
}
