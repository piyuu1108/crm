import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { eq, and, ne } from "drizzle-orm";
import { cacheTags, clearCache } from "@/app/lib/cache";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { AdminUpdateFacultySchema } from "@/app/lib/validations/schemas/admin-faculty";

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(data: any, message?: string) {
  return NextResponse.json({ success: true, data, message }, { status: 200 });
}

function err(error: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json({ success: false, error, errors }, { status });
}

// ─── PUT /api/admin/faculty/[id] — Update a faculty member ────────────────────
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(req, "admin.faculty");
  if (result instanceof NextResponse) return result;

  const { id: idStr } = await context.params;
  const facultyId = parseInt(idStr, 10);
  if (isNaN(facultyId)) {
    return NextResponse.json({ success: false, error: "Invalid faculty ID" }, { status: 400 });
  }

  const audit = AuditLogger.start(req, result, {
    action: "faculty.update",
    category: "admin",
    summary: "Updated faculty member profile",
    entityType: "faculty",
    entityId: facultyId,
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, AdminUpdateFacultySchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);

    const { name, email, mobile, facultyCode, designation } = parsed.data;

    // ── Check uniqueness (email + facultyCode) excluding self ─────────
    const [existingEmail] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(and(eq(faculty.email, email.trim()), ne(faculty.id, facultyId)))
      .limit(1);

    if (existingEmail) {
      return audit.error(
        "Email already registered to another faculty",
        NextResponse.json(
          { success: false, error: "Email already registered to another faculty", errors: { email: "Email already registered to another faculty" } },
          { status: 409 }
        )
      );
    }

    const [existingCode] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(and(eq(faculty.facultyCode, facultyCode.trim()), ne(faculty.id, facultyId)))
      .limit(1);

    if (existingCode) {
      return audit.error(
        "Faculty code already in use",
        NextResponse.json(
          { success: false, error: "Faculty code already in use", errors: { facultyCode: "Faculty code already in use" } },
          { status: 409 }
        )
      );
    }

    // ── Update database ───────────────────────────────────────────────
    const [updated] = await db
      .update(faculty)
      .set({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        facultyCode: facultyCode.trim(),
        designation: designation ? designation.trim() : null,
      })
      .where(eq(faculty.id, facultyId))
      .returning();

    if (!updated) {
      return audit.error("Faculty not found", undefined, 404);
    }

    // ── Invalidate cache ──────────────────────────────────────────────
    try {
      await clearCache(cacheTags.admin.facultyList(1, 10, "", "", "name", "asc"));
    } catch (cacheError) {
      console.warn("[Cache Clear Error] Failed to clear faculty cache:", cacheError);
    }

    return audit.success(
      NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          facultyCode: updated.facultyCode,
          name: updated.name,
        },
        message: "Faculty updated successfully"
      }),
      {
        eid: String(updated.id),
        code: updated.facultyCode,
        name: updated.name,
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
