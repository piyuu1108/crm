import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  circulars,
  circularRecipients,
  students,
  facultySubjectAssignments,
} from "@/app/lib/schema";
import { eq, and, or, inArray } from "drizzle-orm";

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── GET /api/circulars/[slug] — Fetch single circular with access check ──────
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const { userId, roles: jwtRoles } = payload;
    const roles = Array.isArray(jwtRoles) ? jwtRoles : [];

    // Fetch the circular first
    const [circular] = await db
      .select()
      .from(circulars)
      .where(eq(circulars.slug, slug))
      .limit(1);

    if (!circular) return err("Circular not found", 404);

    // ── Access check ────────────────────────────────────────────────────────────
    const isStudent = roles.includes("student");
    const isFaculty =
      roles.includes("faculty") ||
      roles.includes("counselor") ||
      roles.includes("hod");

    // ALL type — everyone can see
    if (circular.targetType === "ALL") {
      return NextResponse.json({ success: true, data: await withDivisions(circular) });
    }

    // FACULTY type — only faculty/counselor/hod
    if (circular.targetType === "FACULTY") {
      if (!isFaculty) return err("Access denied", 403);
      return NextResponse.json({ success: true, data: await withDivisions(circular) });
    }

    // Author can always see their own circular
    if (isFaculty && circular.facultyId === userId) {
      return NextResponse.json({ success: true, data: await withDivisions(circular) });
    }

    // YEAR type — student must match year
    if (circular.targetType === "YEAR") {
      if (!isStudent) {
        // Faculty can see any YEAR circular
        if (isFaculty) return NextResponse.json({ success: true, data: await withDivisions(circular) });
        return err("Access denied", 403);
      }
      const [studentData] = await db
        .select({ currentSemesterNo: students.currentSemesterNo })
        .from(students)
        .where(eq(students.id, userId))
        .limit(1);

      const studentYear = studentData?.currentSemesterNo
        ? Math.ceil(studentData.currentSemesterNo / 2)
        : null;

      if (studentYear === null || studentYear !== circular.targetYear) {
        return err("Access denied", 403);
      }
      return NextResponse.json({ success: true, data: await withDivisions(circular) });
    }

    // DIVISION type — check circular_recipients
    if (circular.targetType === "DIVISION") {
      const recipients = await db
        .select({ divisionId: circularRecipients.divisionId })
        .from(circularRecipients)
        .where(eq(circularRecipients.circularId, circular.id));

      const divisionIds = recipients.map((r) => r.divisionId);

      if (isStudent) {
        const [studentData] = await db
          .select({ currentDivisionId: students.currentDivisionId })
          .from(students)
          .where(eq(students.id, userId))
          .limit(1);

        if (!studentData?.currentDivisionId || !divisionIds.includes(studentData.currentDivisionId)) {
          return err("Access denied", 403);
        }
        return NextResponse.json({
          success: true,
          data: { ...circular, targetDivisionIds: divisionIds },
        });
      }

      if (isFaculty) {
        // Faculty can view division circulars for divisions they teach
        const assignmentRows = await db
          .select({ divisionId: facultySubjectAssignments.divisionId })
          .from(facultySubjectAssignments)
          .where(eq(facultySubjectAssignments.facultyId, userId));

        const facultyDivIds = assignmentRows.map((r) => r.divisionId);
        const hasAccess = divisionIds.some((id) => facultyDivIds.includes(id));

        if (!hasAccess) return err("Access denied", 403);
        return NextResponse.json({
          success: true,
          data: { ...circular, targetDivisionIds: divisionIds },
        });
      }
    }

    return err("Access denied", 403);
  } catch (error) {
    console.error("[GET /api/circulars/[slug]]", error);
    return err("Failed to fetch circular", 500);
  }
}

async function withDivisions(circular: typeof circulars.$inferSelect) {
  if (circular.targetType !== "DIVISION") return circular;
  const rows = await db
    .select({ divisionId: circularRecipients.divisionId })
    .from(circularRecipients)
    .where(eq(circularRecipients.circularId, circular.id));
  return { ...circular, targetDivisionIds: rows.map((r) => r.divisionId) };
}
