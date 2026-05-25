import { db } from "../db";
import {
  faculty,
  timetableEntries,
  facultySubjectAssignments,
  facultyRequestProxies,
  facultyRequests,
  timetableSlots,
} from "../schema";
import { eq, and, inArray } from "drizzle-orm";

async function main() {
  const dateStr = "2026-05-26";
  
  // Fetch all slots to print them
  const slots = await db.select().from(timetableSlots);
  console.log("=== TIMETABLE SLOTS ===");
  slots.forEach(s => {
    console.log(`ID: ${s.id}, SlotNumber: ${s.slotNumber}, Label: '${s.label}', Start: ${s.startTime}, End: ${s.endTime}`);
  });
  console.log("=======================");

  const slot = slots[0];
  if (!slot) {
    console.error("No slots found at all!");
    process.exit(1);
  }

  const slotId = slot.id;
  const dateVal = new Date(dateStr);
  const DAYS_OF_WEEK = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  
  // Try both getDay() and getUTCDay()
  const dayLocal = DAYS_OF_WEEK[dateVal.getDay()];
  const dayUTC = DAYS_OF_WEEK[dateVal.getUTCDay()];

  console.log(`Date: ${dateStr}, Slot ID: ${slotId} (${slot.label})`);
  console.log(`dateVal.getDay() = ${dateVal.getDay()} -> ${dayLocal}`);
  console.log(`dateVal.getUTCDay() = ${dateVal.getUTCDay()} -> ${dayUTC}`);

  // Fetch all active faculties
  const allFaculties = await db
    .select({
      id: faculty.id,
      name: faculty.name,
      facultyCode: faculty.facultyCode,
    })
    .from(faculty)
    .where(eq(faculty.isActive, true));

  console.log(`Total active faculties: ${allFaculties.length}`);

  // Fetch occupied by timetable
  const occupiedByTimetable = await db
    .select({
      facultyId: facultySubjectAssignments.facultyId,
      facultyName: faculty.name,
    })
    .from(timetableEntries)
    .innerJoin(
      facultySubjectAssignments,
      eq(timetableEntries.assignmentId, facultySubjectAssignments.id)
    )
    .innerJoin(
      faculty,
      eq(facultySubjectAssignments.facultyId, faculty.id)
    )
    .where(
      and(
        eq(timetableEntries.slotId, slotId),
        eq(timetableEntries.dayOfWeek, dayUTC), // use UTC
        eq(timetableEntries.isActive, true)
      )
    );

  console.log(`Occupied by timetable using day '${dayUTC}': ${occupiedByTimetable.length}`);
  occupiedByTimetable.forEach(o => console.log(`  - ${o.facultyName} (ID: ${o.facultyId})`));

  const occupiedTimetableIds = new Set(occupiedByTimetable.map((o) => o.facultyId));
  const available = allFaculties.filter(f => !occupiedTimetableIds.has(f.id));
  console.log(`Available faculties: ${available.length}`);
  available.forEach(a => console.log(`  * ${a.name} (Code: ${a.facultyCode}, ID: ${a.id})`));
}

main().catch(console.error);
