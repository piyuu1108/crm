import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { eq, and, ne } from "drizzle-orm";
import { cacheTags, clearCache } from "@/app/lib/cache";

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(data: any, message?: string) {
  return NextResponse.json({ success: true, data, message }, { status: 200 });
}

function err(error: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json({ success: false, error, errors }, { status });
}

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function authorize(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── PUT /api/admin/faculty/[id] — Update a faculty member ────────────────────
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
    if ("error" in auth && auth.error) return auth.error;

    const { id: idStr } = await context.params;
    const facultyId = parseInt(idStr, 10);
    if (isNaN(facultyId)) {
      return err("Invalid faculty ID", 400);
    }

    const body = await req.json();
    const { name, email, mobile, facultyCode, designation } = body;

    // ── Input validation ──────────────────────────────────────────────
    const errors: Record<string, string> = {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.name = "Full name is required";
    } else if (name.trim().length > 100) {
      errors.name = "Name must be 100 characters or less";
    }

    if (!email || typeof email !== "string") {
      errors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim())) {
      errors.email = "Invalid email format";
    } else if (email.trim().length > 150) {
      errors.email = "Email must be 150 characters or less";
    }

    if (!mobile || typeof mobile !== "string" || mobile.trim().length === 0) {
      errors.mobile = "Mobile number is required";
    } else if (!/^\d{10,15}$/.test(mobile.trim())) {
      errors.mobile = "Mobile must be 10–15 digits";
    }

    if (!facultyCode || typeof facultyCode !== "string" || facultyCode.trim().length === 0) {
      errors.facultyCode = "Faculty code is required";
    } else if (facultyCode.trim().length > 20) {
      errors.facultyCode = "Faculty code must be 20 characters or less";
    }

    if (designation && typeof designation === "string" && designation.trim().length > 100) {
      errors.designation = "Designation must be 100 characters or less";
    }

    if (Object.keys(errors).length > 0) {
      return err("Validation failed", 400, errors);
    }

    // ── Check uniqueness (email + facultyCode) excluding self ─────────
    const [existingEmail] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(and(eq(faculty.email, email.trim()), ne(faculty.id, facultyId)))
      .limit(1);

    if (existingEmail) {
      return err("Validation failed", 409, { email: "Email already registered to another faculty" });
    }

    const [existingCode] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(and(eq(faculty.facultyCode, facultyCode.trim()), ne(faculty.id, facultyId)))
      .limit(1);

    if (existingCode) {
      return err("Validation failed", 409, { facultyCode: "Faculty code already in use" });
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
      return err("Faculty not found", 404);
    }

    // ── Invalidate cache ──────────────────────────────────────────────
    try {
      await clearCache(cacheTags.admin.facultyList(1, 10, "", "", "name", "asc"));
    } catch (cacheError) {
      console.warn("[Cache Clear Error] Failed to clear faculty cache:", cacheError);
    }

    return ok({
      id: updated.id,
      facultyCode: updated.facultyCode,
      name: updated.name,
    }, "Faculty updated successfully");
  } catch (error) {
    console.error(`[PUT /api/admin/faculty/[id]] Error:`, error);
    return err("Internal server error", 500);
  }
}
