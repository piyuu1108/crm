import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { subjects } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { validateSubjectForm, type SubjectFormData } from "@/app/lib/validations/subject";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

function err(message: string, status: number, errors?: Record<string, string>) {
  return NextResponse.json(
    { success: false, error: message, ...(errors ? { errors } : {}) },
    { status }
  );
}

// ─── Auth guard — JWT double-verification + HOD role check ────────────────────
async function authorize() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return { error: err("Unauthorized", 401) };

  const payload = await verifyToken(token);
  if (!payload) return { error: err("Unauthorized: invalid or expired session", 401) };

  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
  if (!rolesArray.includes("hod")) {
    return { error: err("Forbidden: HOD access required", 403) };
  }

  return { payload };
}

// ─── POST /api/admin/subjects — Create a new subject ──────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

    const body = await req.json();
    const formData: SubjectFormData = {
      code: String(body.code ?? ""),
      name: String(body.name ?? ""),
      subjectType: String(body.subjectType ?? ""),
      internalTheoryMax: String(body.internalTheoryMax ?? ""),
      externalTheoryMax: String(body.externalTheoryMax ?? ""),
      theoryPassingMarks: String(body.theoryPassingMarks ?? ""),
      internalPracticalMax: String(body.internalPracticalMax ?? ""),
      externalPracticalMax: String(body.externalPracticalMax ?? ""),
      practicalPassingMarks: String(body.practicalPassingMarks ?? ""),
    };

    console.log("[POST /api/admin/subjects] payload:", formData);

    // ── Validation ──
    const validation = validateSubjectForm(formData);
    if (!validation.valid) {
      const errorMap: Record<string, string> = {};
      for (const e of validation.errors) {
        if (!errorMap[e.field]) errorMap[e.field] = e.message;
      }
      console.warn("[POST /api/admin/subjects] Validation failed:", errorMap);
      return err("Validation failed", 400, errorMap);
    }

    // ── Check uniqueness of subject code ──
    const trimmedCode = formData.code.trim();
    const [existing] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.code, trimmedCode))
      .limit(1);

    if (existing) {
      return err("Validation failed", 409, {
        code: `Subject code "${trimmedCode}" already exists`,
      });
    }

    // ── Build insert payload ──
    const type = formData.subjectType;
    const hasTheory = type === "theory" || type === "both";
    const hasPractical = type === "practical" || type === "both";

    const [created] = await db
      .insert(subjects)
      .values({
        code: trimmedCode,
        name: formData.name.trim(),
        subjectType: type,
        // Theory marks (null if not applicable)
        internalTheoryMax: hasTheory ? Number(formData.internalTheoryMax) : null,
        externalTheoryMax: hasTheory ? Number(formData.externalTheoryMax) : null,
        theoryPassingMarks: hasTheory ? Number(formData.theoryPassingMarks) : null,
        // Practical marks (null if not applicable)
        internalPracticalMax: hasPractical ? Number(formData.internalPracticalMax) : null,
        externalPracticalMax: hasPractical ? Number(formData.externalPracticalMax) : null,
        practicalPassingMarks: hasPractical ? Number(formData.practicalPassingMarks) : null,
      })
      .returning({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        subjectType: subjects.subjectType,
        internalTheoryMax: subjects.internalTheoryMax,
        externalTheoryMax: subjects.externalTheoryMax,
        theoryPassingMarks: subjects.theoryPassingMarks,
        internalPracticalMax: subjects.internalPracticalMax,
        externalPracticalMax: subjects.externalPracticalMax,
        practicalPassingMarks: subjects.practicalPassingMarks,
        createdAt: subjects.createdAt,
      });

    console.log("[POST /api/admin/subjects] Created:", created);
    return ok(created);
  } catch (error) {
    console.error("[POST /api/admin/subjects] Error:", error);
    return err("Internal server error", 500);
  }
}
