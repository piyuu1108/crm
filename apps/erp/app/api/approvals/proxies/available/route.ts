import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  faculty,
  timetableEntries,
  facultySubjectAssignments,
  facultyRequestProxies,
  facultyRequests,
} from "@/app/lib/schema";
import { eq, and, notInArray, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "approvals.create");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const slotIdParam = searchParams.get("slotId");

    if (!dateStr || !slotIdParam) {
      return NextResponse.json(
        { success: false, error: "date and slotId are required" },
        { status: 400 }
      );
    }

    const slotId = parseInt(slotIdParam, 10);
    if (isNaN(slotId)) {
      return NextResponse.json(
        { success: false, error: "Invalid slotId" },
        { status: 400 }
      );
    }

    const dateVal = new Date(dateStr);
    if (isNaN(dateVal.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Safely get the day name in UTC to avoid local timezone shifts
    const [year, month, day] = dateStr.split("-").map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const dayName = DAYS_OF_WEEK[utcDate.getUTCDay()];

    // 1. Fetch all active faculties
    const allFaculties = await db
      .select({
        id: faculty.id,
        name: faculty.name,
        facultyCode: faculty.facultyCode,
      })
      .from(faculty)
      .where(eq(faculty.isActive, true));

    // 2. Fetch faculties occupied by their own timetable schedule on this slot & day
    const occupiedByTimetable = await db
      .select({
        facultyId: facultySubjectAssignments.facultyId,
      })
      .from(timetableEntries)
      .innerJoin(
        facultySubjectAssignments,
        eq(timetableEntries.assignmentId, facultySubjectAssignments.id)
      )
      .where(
        and(
          eq(timetableEntries.slotId, slotId),
          eq(timetableEntries.dayOfWeek, dayName),
          eq(timetableEntries.isActive, true)
        )
      );

    const occupiedTimetableIds = new Set(occupiedByTimetable.map((o) => o.facultyId));

    // 3. Fetch faculties occupied by proxy assignments on this date & slot
    // We only exclude them if the parent request is pending or approved
    const occupiedByProxy = await db
      .select({
        proxyFacultyId: facultyRequestProxies.proxyFacultyId,
      })
      .from(facultyRequestProxies)
      .innerJoin(
        facultyRequests,
        eq(facultyRequestProxies.requestId, facultyRequests.id)
      )
      .where(
        and(
          eq(facultyRequestProxies.date, dateStr),
          eq(facultyRequestProxies.slotId, slotId),
          inArray(facultyRequestProxies.status, ["pending", "approved"]),
          inArray(facultyRequests.status, ["pending", "approved"])
        )
      );

    const occupiedProxyIds = new Set(occupiedByProxy.map((o) => o.proxyFacultyId));

    // 4. Exclude occupied faculties from the list
    const availableFaculties = allFaculties.filter(
      (fac) =>
        !occupiedTimetableIds.has(fac.id) &&
        !occupiedProxyIds.has(fac.id) &&
        fac.id !== auth.userId // Can't be a proxy for yourself!
    );

    return NextResponse.json({ success: true, data: availableFaculties });
  } catch (error) {
    console.error("[GET /api/approvals/proxies/available] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
