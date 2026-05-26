import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  timetableEntries,
  facultySubjectAssignments,
  timetableSlots,
  divisions,
  subjects,
  facultyRequests,
  facultyRequestProxies,
  faculty,
} from "@/app/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getDatesInRange(startDate: Date, endDate: Date) {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

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

    const { userId } = auth;
    const { searchParams } = new URL(req.url);

    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");

    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { success: false, error: "fromDate and toDate are required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { success: false, error: "fromDate cannot be after toDate" },
        { status: 400 }
      );
    }

    // Limit date range to a maximum of 30 days to avoid performance overhead
    const dateDifference = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dateDifference > 30) {
      return NextResponse.json(
        { success: false, error: "Date range cannot exceed 30 days" },
        { status: 400 }
      );
    }

    const dates = getDatesInRange(fromDate, toDate);

    // Fetch all active timetable slots
    const slots = await db
      .select()
      .from(timetableSlots)
      .where(eq(timetableSlots.isBreak, false))
      .orderBy(timetableSlots.slotNumber);

    const slotMap = new Map(slots.map((s) => [s.id, s]));

    // Query active timetable entries assigned to the faculty
    const entries = await db
      .select({
        id: timetableEntries.id,
        dayOfWeek: timetableEntries.dayOfWeek,
        startTime: timetableEntries.startTime,
        endTime: timetableEntries.endTime,
        slotId: timetableEntries.slotId,
        divisionId: facultySubjectAssignments.divisionId,
        divisionName: divisions.displayName,
        subjectId: facultySubjectAssignments.subjectId,
        subjectName: subjects.name,
      })
      .from(timetableEntries)
      .innerJoin(
        facultySubjectAssignments,
        eq(timetableEntries.assignmentId, facultySubjectAssignments.id)
      )
      .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
      .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
      .where(
        and(
          eq(facultySubjectAssignments.facultyId, userId),
          eq(timetableEntries.isActive, true)
        )
      );

    // Query active proxy duties assigned to the faculty on dates within the range
    const activeProxies = await db
      .select({
        id: facultyRequestProxies.id,
        date: facultyRequestProxies.date,
        slotId: facultyRequestProxies.slotId,
        divisionId: facultyRequestProxies.divisionId,
        divisionName: divisions.displayName,
        subjectId: facultyRequestProxies.subjectId,
        subjectName: subjects.name,
        startTime: timetableSlots.startTime,
        endTime: timetableSlots.endTime,
        originalFacultyId: facultyRequestProxies.originalFacultyId,
        originalFacultyName: faculty.name,
      })
      .from(facultyRequestProxies)
      .innerJoin(facultyRequests, eq(facultyRequestProxies.requestId, facultyRequests.id))
      .innerJoin(divisions, eq(facultyRequestProxies.divisionId, divisions.id))
      .innerJoin(subjects, eq(facultyRequestProxies.subjectId, subjects.id))
      .innerJoin(timetableSlots, eq(facultyRequestProxies.slotId, timetableSlots.id))
      .innerJoin(faculty, eq(facultyRequestProxies.originalFacultyId, faculty.id))
      .where(
        and(
          eq(facultyRequestProxies.proxyFacultyId, userId),
          inArray(facultyRequestProxies.status, ["pending", "approved"]),
          inArray(facultyRequests.status, ["pending", "approved"]),
          sql`${facultyRequestProxies.date} >= ${fromDateStr}`,
          sql`${facultyRequestProxies.date} <= ${toDateStr}`
        )
      );

    // Group matching entries day by day
    const result = dates.map((d) => {
      const dayName = DAYS_OF_WEEK[d.getUTCDay()];
      const dateStr = d.toISOString().split("T")[0];

      // 1. Regular timetable lectures for this day of the week
      const matchingTimetable = entries
        .filter((entry) => entry.dayOfWeek.toLowerCase() === dayName.toLowerCase())
        .map((entry) => {
          const resolvedSlot = entry.slotId ? slotMap.get(entry.slotId) : null;
          return {
            slotId: entry.slotId,
            label: resolvedSlot ? `${resolvedSlot.label} (${resolvedSlot.startTime.slice(0, 5)} - ${resolvedSlot.endTime.slice(0, 5)})` : `${entry.startTime.slice(0, 5)} - ${entry.endTime.slice(0, 5)}`,
            startTime: entry.startTime,
            endTime: entry.endTime,
            divisionId: entry.divisionId,
            divisionName: entry.divisionName,
            subjectId: entry.subjectId,
            subjectName: entry.subjectName,
            isProxyDuty: false,
          };
        });

      // 2. Active proxy duties for this specific calendar date
      const matchingProxies = activeProxies
        .filter((proxy) => proxy.date === dateStr)
        .map((proxy) => {
          const resolvedSlot = proxy.slotId ? slotMap.get(proxy.slotId) : null;
          return {
            slotId: proxy.slotId,
            label: resolvedSlot ? `Proxy: ${resolvedSlot.label} (${resolvedSlot.startTime.slice(0, 5)} - ${resolvedSlot.endTime.slice(0, 5)})` : `Proxy: ${proxy.startTime.slice(0, 5)} - ${proxy.endTime.slice(0, 5)}`,
            startTime: proxy.startTime,
            endTime: proxy.endTime,
            divisionId: proxy.divisionId,
            divisionName: proxy.divisionName,
            subjectId: proxy.subjectId,
            subjectName: proxy.subjectName,
            isProxyDuty: true,
            originalFacultyId: proxy.originalFacultyId,
            originalFacultyName: proxy.originalFacultyName,
          };
        });

      // Combine chronologically
      const allLectures = [...matchingTimetable, ...matchingProxies].sort((a, b) => {
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA.localeCompare(timeB);
      });

      return {
        date: dateStr,
        dayOfWeek: dayName,
        lectures: allLectures,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[GET /api/approvals/timetable] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
