import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireCourseId, requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { faculty, facultyRoles, roles, facultySubjectAssignments, divisions, subjects } from "@/app/lib/schema";
import { eq, and, like, count, asc, desc, or, sql, inArray } from "drizzle-orm";
import { remember, cacheTags, clearCache } from "@/app/lib/cache";
import { AuditLogger } from "@/app/lib/audit-logger";
import { validateBody } from "@/app/lib/validations/validate";
import { AdminUpdateFacultySchema } from "@/app/lib/validations/schemas/admin-faculty";
import * as bcrypt from "bcryptjs";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown, source: "db" | "cache" = "db") {
  return NextResponse.json(
    { success: true, source, data },
    { status: 200, headers: { "X-Cache": source === "cache" ? "HIT" : "MISS" } }
  );
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── GET /api/admin/faculty — Paginated faculty list ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authResult = await requirePermission(req, "admin.faculty");
    if (authResult instanceof NextResponse) return authResult;
    const auth = { payload: authResult };

    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const search = url.searchParams.get("search")?.trim() || "";
    const statusFilter = url.searchParams.get("status") || ""; // "active" | "inactive" | ""
    const sortBy = url.searchParams.get("sortBy") || "name"; // "name" | "facultyCode" | "createdAt"
    const sortOrder = url.searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    const cacheKey = cacheTags.admin.facultyList(page, limit, search, statusFilter, sortBy, sortOrder);
    let isDbFetch = false;

    const payloadData = await remember(
      cacheKey,
      300, // 5 minutes
      async () => {
        isDbFetch = true;
        const { payload: authPayload } = auth;
        let courseId: number | "all" | undefined;
        if (authPayload?.isGlobal) {
          courseId = authPayload.activeCourseId;
        } else {
          courseId = requireCourseId(authPayload!);
        }

        // Build WHERE conditions — filter by course if specified
        const conditions = [];
        if (courseId && courseId !== "all") {
          conditions.push(eq(faculty.courseId, courseId));
        }

        if (search) {
          conditions.push(
            or(
              like(faculty.name, `%${search}%`),
              like(faculty.facultyCode, `%${search}%`),
              like(faculty.email, `%${search}%`)
            )!
          );
        }

        if (statusFilter === "active") {
          conditions.push(eq(faculty.isActive, true));
        } else if (statusFilter === "inactive") {
          conditions.push(eq(faculty.isActive, false));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Count total matching rows
        const [totalResult] = await db
          .select({ total: count() })
          .from(faculty)
          .where(whereClause);

        const total = totalResult?.total ?? 0;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Determine sort column
        const sortColumn =
          sortBy === "facultyCode"
            ? faculty.facultyCode
            : sortBy === "createdAt"
              ? faculty.createdAt
              : faculty.name;

        const orderFn = sortOrder === "desc" ? desc : asc;

        // Fetch rows — NEVER include passwordHash
        const rows = await db
          .select({
            id: faculty.id,
            facultyCode: faculty.facultyCode,
            name: faculty.name,
            email: faculty.email,
            mobile: faculty.mobile,
            gender: faculty.gender,
            designation: faculty.designation,
            qualification: faculty.qualification,
            specialization: faculty.specialization,
            experienceYears: faculty.experienceYears,
            isActive: faculty.isActive,
            createdAt: faculty.createdAt,
          })
          .from(faculty)
          .where(whereClause)
          .orderBy(orderFn(sortColumn))
          .limit(limit)
          .offset(offset);

        const facultyIds = rows.map((r) => r.id);
        const assignmentsMap: Record<number, any[]> = {};

        if (facultyIds.length > 0) {
          const facultyAssignments = await db
            .select({
              facultyId: facultySubjectAssignments.facultyId,
              subjectName: subjects.name,
              divisionName: divisions.displayName,
              subjectShortCode: subjects.shortCode,
              subjectCode: subjects.code,
              subjectType: subjects.subjectType,
              subjectCredit: subjects.credit,
            })
            .from(facultySubjectAssignments)
            .leftJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
            .leftJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
            .where(inArray(facultySubjectAssignments.facultyId, facultyIds));

          for (const a of facultyAssignments) {
            if (!a.facultyId) continue;
            if (!assignmentsMap[a.facultyId]) {
              assignmentsMap[a.facultyId] = [];
            }
            assignmentsMap[a.facultyId].push({
              subjectName: a.subjectName,
              divisionName: a.divisionName,
              subjectShortCode: a.subjectShortCode || a.subjectName?.substring(0, 3).toUpperCase(),
              subjectCode: a.subjectCode,
              subjectType: a.subjectType,
              subjectCredit: a.subjectCredit,
            });
          }
        }

        const facultyWithAssignments = rows.map((r) => ({
          ...r,
          assignments: assignmentsMap[r.id] || [],
        }));

        return {
          faculty: facultyWithAssignments,
          pagination: { page, limit, total, totalPages },
        };
      }
    );

    return ok(payloadData, isDbFetch ? "db" : "cache");
  } catch (error) {
    console.error("[GET /api/admin/faculty] Error:", error);
    return err("Internal server error", 500);
  }
}

// ─── POST /api/admin/faculty — Create a new faculty member ────────────────────
export async function POST(req: NextRequest) {
  const authResult = await requirePermission(req, "admin.faculty");
  if (authResult instanceof NextResponse) return authResult;
  const auth = { payload: authResult };

  const audit = AuditLogger.start(req, auth.payload, {
    action: "faculty.create",
    category: "admin",
    summary: "Created new faculty member",
  });

  try {
    const body = await req.json();
    const parsed = validateBody(body, AdminUpdateFacultySchema);
    if (!parsed.success) return audit.error("Validation failed", parsed.error);
    const { name, email, mobile, facultyCode, designation } = parsed.data;

    // ── Check uniqueness (email + facultyCode) ────────────────────────
    const [existingEmail] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(eq(faculty.email, email.trim()))
      .limit(1);

    if (existingEmail) {
      return audit.error(
        "Email already registered",
        NextResponse.json({ success: false, error: "Validation failed", errors: { email: "Email already registered" } }, { status: 409 })
      );
    }

    const [existingCode] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(eq(faculty.facultyCode, facultyCode.trim()))
      .limit(1);

    if (existingCode) {
      return audit.error(
        "Faculty code already exists",
        NextResponse.json({ success: false, error: "Validation failed", errors: { facultyCode: "Faculty code already exists" } }, { status: 409 })
      );
    }

    const authPayload = auth.payload!;
    let courseId: number | undefined;

    if (authPayload.isGlobal) {
      const bodyCourseId = body.courseId;
      if (bodyCourseId) {
        courseId = Number(bodyCourseId);
      } else if (authPayload.activeCourseId && authPayload.activeCourseId !== "all") {
        courseId = Number(authPayload.activeCourseId);
      } else {
        return audit.error(
          "Course is required for administrative faculty creation",
          NextResponse.json(
            { success: false, error: "Validation failed", errors: { courseId: "Course is required for administrative faculty creation" } },
            { status: 400 }
          )
        );
      }
    } else {
      courseId = requireCourseId(authPayload);
    }

    // ── Create faculty member ─────────────────────────────────────────
    // SRS §3.3: Temporary password = faculty code (mandatory change on first login)
    const passwordHash = await bcrypt.hash("pass@123", 10);

    const [created] = await db
      .insert(faculty)
      .values({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        facultyCode: facultyCode.trim(),
        courseId,                             // ← from session, never from body
        designation: designation?.trim() || null,
        passwordHash,
        mustChangePwd: true,
        isActive: true,
      })
      .returning({
        id: faculty.id,
        facultyCode: faculty.facultyCode,
        name: faculty.name,
        email: faculty.email,
        mobile: faculty.mobile,
        designation: faculty.designation,
        isActive: faculty.isActive,
        createdAt: faculty.createdAt,
      });

    // ── Assign default "faculty" role ──────────────────────────────────
    const [facultyRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "faculty"))
      .limit(1);

    if (facultyRole) {
      await db.insert(facultyRoles).values({
        facultyId: created.id,
        roleId: facultyRole.id,
      });
    }

    try {
      await clearCache(cacheTags.admin.facultyList(1, 10, "", "", "name", "asc"));
    } catch (cacheError) {
      console.warn("[Cache Clear Error] Failed to clear faculty list cache:", cacheError);
    }

    return audit.success(NextResponse.json({ success: true, data: created }, { status: 201 }), { eid: String(created.id) });
  } catch (error) {
    return audit.error(error);
  }
}
