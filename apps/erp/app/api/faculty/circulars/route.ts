import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { circulars, circularRecipients, faculty } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { invalidateCircularUpdated } from "@/app/lib/cache";

const VALID_TARGET_TYPES = ["ALL", "FACULTY", "YEAR", "DIVISION"] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.some((r) => r === "faculty" || r === "counselor" || r === "hod")) {
      return err("Forbidden: faculty role required", 403);
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
      targetDivisionIds, // number[] — for DIVISION type
    } = body;

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return err("Title is required");
    }
    if (title.trim().length > 255) {
      return err("Title must be 255 characters or less");
    }
    if (!VALID_TARGET_TYPES.includes(targetType as TargetType)) {
      return err(`Invalid target type. Must be one of: ${VALID_TARGET_TYPES.join(", ")}`);
    }
    if (targetType === "YEAR") {
      const year = Number(targetYear);
      if (!year || year < 1 || year > 6) {
        return err("Target year must be between 1 and 6");
      }
    }
    if (targetType === "DIVISION") {
      if (!Array.isArray(targetDivisionIds) || targetDivisionIds.length === 0) {
        return err("At least one division must be selected for Division-targeted circulars");
      }
      const ids = targetDivisionIds.map(Number);
      if (ids.some((id) => isNaN(id) || id <= 0)) {
        return err("Invalid division ID(s)");
      }
    }

    // ── Get Faculty Name ────────────────────────────────────────────────────────
    const [facultyData] = await db
      .select({ name: faculty.name })
      .from(faculty)
      .where(eq(faculty.id, payload.userId))
      .limit(1);

    if (!facultyData) return err("Faculty not found", 404);

    // ── Generate slug ───────────────────────────────────────────────────────────
    const baseSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 80);
    const randomHash = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${randomHash}`;

    // ── Insert circular ─────────────────────────────────────────────────────────
    const [newCircular] = await db
      .insert(circulars)
      .values({
        slug,
        title: title.trim(),
        description,
        attachmentUrl: attachmentUrl ?? null,
        attachmentType: attachmentType ?? null,
        attachmentSize: attachmentSize ?? null,
        targetType,
        targetYear: targetType === "YEAR" ? Number(targetYear) : null,
        facultyId: payload.userId,
        facultyName: facultyData.name,
      })
      .returning();

    // ── Insert division recipients (for DIVISION type) ─────────────────────────
    if (targetType === "DIVISION" && Array.isArray(targetDivisionIds) && targetDivisionIds.length > 0) {
      const uniqueIds = [...new Set(targetDivisionIds.map(Number))];
      await db.insert(circularRecipients).values(
        uniqueIds.map((divisionId) => ({
          circularId: newCircular.id,
          divisionId,
        }))
      );
      console.log(`[POST /api/faculty/circulars] Created circular id=${newCircular.id} slug=${newCircular.slug} type=${targetType} divisionIds=${uniqueIds.join(",")}`);
    } else {
      console.log(`[POST /api/faculty/circulars] Created circular id=${newCircular.id} slug=${newCircular.slug} type=${targetType} year=${newCircular.targetYear ?? "n/a"}`);
    }

    // Invalidate cached circular lists for target visibility
    await invalidateCircularUpdated({
      targetType,
      targetYear: targetYear ? Number(targetYear) : null,
      recipientDivisions: targetDivisionIds ? targetDivisionIds.map(Number) : [],
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newCircular,
          targetDivisionIds:
            targetType === "DIVISION" ? targetDivisionIds.map(Number) : [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/faculty/circulars]", error);
    return err("Failed to create circular", 500);
  }
}
