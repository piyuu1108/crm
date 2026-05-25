import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireCourseId } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { subjects, facultySubjectAssignments, divisions, faculty } from "@/app/lib/schema";
import { eq, count, inArray, and } from "drizzle-orm";
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

async function authorize(req: NextRequest, allowedRoles: string[] = ["hod"]) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  const isAuthorized = allowedRoles.some((role) => rolesArray.includes(role));
  if (!isAuthorized) {
    return { error: err("Forbidden: Access denied", 403) };
  }

  return { payload };
}

// ─── GET /api/admin/subjects — List subjects scoped to HOD's course ────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, ["hod", "principal", "vice_principal"]);
    if ("error" in auth && auth.error) return auth.error;

    let courseId: number | "all" | undefined;
    if (auth.payload?.isGlobal) {
      courseId = auth.payload.activeCourseId;
    } else {
      courseId = requireCourseId(auth.payload!);
    }

    const conditions = [];
    if (courseId && courseId !== "all") {
      conditions.push(eq(subjects.courseId, courseId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch subjects scoped to this HOD's or Admin's course
    const rows = await db
      .select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        shortCode: subjects.shortCode,
        subjectType: subjects.subjectType,
        credit: subjects.credit,
        semester: subjects.semester,
        internalTheoryMax: subjects.internalTheoryMax,
        externalTheoryMax: subjects.externalTheoryMax,
        theoryPassingMarks: subjects.theoryPassingMarks,
        internalPracticalMax: subjects.internalPracticalMax,
        externalPracticalMax: subjects.externalPracticalMax,
        practicalPassingMarks: subjects.practicalPassingMarks,
        createdAt: subjects.createdAt,
      })
      .from(subjects)
      .where(whereClause)
      .orderBy(subjects.code);

    const subjectIds = rows.map((r) => r.id);
    const assignmentsMap: Record<number, { divisionName: string; facultyName: string }[]> = {};

    if (subjectIds.length > 0) {
      const assignmentRows = await db
        .select({
          subjectId: facultySubjectAssignments.subjectId,
          divisionName: divisions.displayName,
          facultyName: faculty.name,
        })
        .from(facultySubjectAssignments)
        .leftJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
        .leftJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .where(inArray(facultySubjectAssignments.subjectId, subjectIds));

      for (const a of assignmentRows) {
        if (!a.subjectId) continue;
        if (!assignmentsMap[a.subjectId]) assignmentsMap[a.subjectId] = [];
        assignmentsMap[a.subjectId].push({
          divisionName: a.divisionName ?? "—",
          facultyName: a.facultyName ?? "—",
        });
      }
    }

    const data = rows.map((r) => ({
      ...r,
      assignments: assignmentsMap[r.id] ?? [],
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/subjects] Error:", error);
    return err("Internal server error", 500);
  }
}

// ─── POST /api/admin/subjects — Create a new subject ──────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req);
    if ("error" in auth && auth.error) return auth.error;

    const courseId = requireCourseId(auth.payload!);

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
        courseId,                              // ← from session, never from body
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
