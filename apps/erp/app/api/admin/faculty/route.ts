import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { faculty, facultyRoles, roles, facultySubjectAssignments, divisions, subjects } from "@/app/lib/schema";
import { eq, and, like, count, asc, desc, or, sql, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redis } from "@/app/lib/redis";

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

// ─── Auth guard (JWT double-verification + HOD role check) ────────────────────
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

// ─── GET /api/admin/faculty — Paginated faculty list ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const search = url.searchParams.get("search")?.trim() || "";
    const statusFilter = url.searchParams.get("status") || ""; // "active" | "inactive" | ""
    const sortBy = url.searchParams.get("sortBy") || "name"; // "name" | "facultyCode" | "createdAt"
    const sortOrder = url.searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    const cacheKey = `faculty:list:page:${page}:limit:${limit}:search:${search}:status:${statusFilter}:sortBy:${sortBy}:sortOrder:${sortOrder}`;

    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`[Faculty Cache] HIT for key: ${cacheKey}`);
        return ok(cachedData, "cache");
      }
    } catch (redisError) {
      console.warn("[Redis GET Error] Falling back to DB:", redisError);
    }

    console.log(`[Faculty Cache] MISS for key: ${cacheKey}. Fetching from DB...`);

    // Build WHERE conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(faculty.name, `%${search}%`),
          like(faculty.facultyCode, `%${search}%`),
          like(faculty.email, `%${search}%`)
        )
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
          subjectName: facultySubjectAssignments.subjectName,
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

    const payloadData = {
      faculty: facultyWithAssignments,
      pagination: { page, limit, total, totalPages },
    };

    try {
      await redis.set(cacheKey, payloadData, { ex: 300 });
    } catch (redisError) {
      console.warn("[Redis SET Error] Failed to cache data:", redisError);
    }

    return ok(payloadData, "db");
  } catch (error) {
    console.error("[GET /api/admin/faculty] Error:", error);
    return err("Internal server error", 500);
  }
}

// ─── POST /api/admin/faculty — Create a new faculty member ────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize();
    if ("error" in auth && auth.error) return auth.error;

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
      return NextResponse.json(
        { success: false, error: "Validation failed", errors },
        { status: 400 }
      );
    }

    // ── Check uniqueness (email + facultyCode) ────────────────────────
    const [existingEmail] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(eq(faculty.email, email.trim()))
      .limit(1);

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "Validation failed", errors: { email: "Email already registered" } },
        { status: 409 }
      );
    }

    const [existingCode] = await db
      .select({ id: faculty.id })
      .from(faculty)
      .where(eq(faculty.facultyCode, facultyCode.trim()))
      .limit(1);

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: "Validation failed", errors: { facultyCode: "Faculty code already exists" } },
        { status: 409 }
      );
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

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/faculty] Error:", error);
    return err("Internal server error", 500);
  }
}
