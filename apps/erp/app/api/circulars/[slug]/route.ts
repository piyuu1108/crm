import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { isFacultyLikeRole } from "@/app/lib/permissions";
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
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const auth = await requirePermission(req, "circulars.view");
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole } = auth;
    const isStudent = activeRole === "student";
    const isFaculty = isFacultyLikeRole(activeRole);

    // Fetch the circular first
    const [circular] = await db
      .select()
      .from(circulars)
      .where(eq(circulars.slug, slug))
      .limit(1);

    if (!circular) return err("Circular not found", 404);

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
