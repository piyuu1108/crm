import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { isAdminTableRole } from "@/app/lib/permissions";
import { db } from "@/app/lib/db";
import { circulars, circularRecipients, faculty } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { cacheTags, clearCache } from "@/app/lib/cache";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { CreateCircularSchema } from "@/app/lib/validations/schemas/circular";

const VALID_TARGET_TYPES = ["ALL", "FACULTY", "YEAR", "DIVISION"] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const result = await requirePermission(req, "circulars.create");
  if (result instanceof NextResponse) return result;
  const auth = result;

  const audit = AuditLogger.start(req, auth, {
    action: "circulars.create",
    category: "circulars",
    summary: "Created new circular",
    entityType: "circular",
  });

  try {
    const isGlobalAdmin = isAdminTableRole(auth.activeRole);

    const body = await req.json();
    const parsed = validateBody(body, CreateCircularSchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const {
      title,
      description,
      attachmentUrl,
      attachmentType,
      attachmentSize,
      targetType,
      targetYear,
      targetDivisionIds,
    } = parsed.data;

    // ── Get Creator Name ────────────────────────────────────────────────────────
    let creatorName = "";
    if (isGlobalAdmin) {
      const { administrators } = await import("@/app/lib/schema");
      const [adminData] = await db
        .select({ name: administrators.name })
        .from(administrators)
        .where(eq(administrators.id, auth.userId))
        .limit(1);
      if (!adminData) return audit.error("Administrator not found", undefined, 404);
      creatorName = adminData.name;
    } else {
      const [facultyData] = await db
        .select({ name: faculty.name })
        .from(faculty)
        .where(eq(faculty.id, auth.userId))
        .limit(1);
      if (!facultyData) return audit.error("Faculty not found", undefined, 404);
      creatorName = facultyData.name;
    }

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
        facultyId: isGlobalAdmin ? null : auth.userId,
        adminId: isGlobalAdmin ? auth.userId : null,
        facultyName: creatorName,
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
    }

    // Invalidate cached circular lists for target visibility
    try {
      if (targetType === "ALL") {
        await clearCache(cacheTags.circulars.global());
      } else if (targetType === "FACULTY") {
        await clearCache(cacheTags.circulars.faculty());
      } else if (targetType === "YEAR" && targetYear) {
        await clearCache(cacheTags.circulars.year(Number(targetYear)));
      } else if (targetType === "DIVISION" && targetDivisionIds) {
        for (const divId of targetDivisionIds) {
          await clearCache(cacheTags.circulars.division(Number(divId)));
        }
      }
    } catch (cacheError) {
      console.warn("[Cache Error] Failed to invalidate circular cache:", cacheError);
    }

    return audit.success(
      NextResponse.json(
        {
          success: true,
          data: {
            ...newCircular,
            targetDivisionIds:
              targetType === "DIVISION" ? (targetDivisionIds ?? []).map(Number) : [],
          },
        },
        { status: 201 }
      ),
      {
        eid: String(newCircular.id),
        slug: newCircular.slug,
        ttyp: targetType,
        tyr: targetType === "YEAR" ? Number(targetYear) : undefined,
        divs: targetType === "DIVISION" ? (targetDivisionIds ?? []).map(Number) : undefined,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
