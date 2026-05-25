import { db } from "../db";
import {
  timetableSlots,
  timetableEntries,
  facultySubjectAssignments,
  facultyRequestProxies,
  facultyRequestApprovals,
  facultyRequestDocuments,
  facultyRequests,
} from "../schema";

async function main() {
  console.log("⏳ Starting cleanup of ERP tables...");

  // 1. Delete dependent tables in order to resolve foreign keys
  console.log("Deleting faculty_request_proxies...");
  await db.delete(facultyRequestProxies);

  console.log("Deleting faculty_request_approvals...");
  await db.delete(facultyRequestApprovals);

  console.log("Deleting faculty_request_documents...");
  await db.delete(facultyRequestDocuments);

  console.log("Deleting faculty_requests...");
  await db.delete(facultyRequests);

  console.log("Deleting timetable_entries...");
  await db.delete(timetableEntries);

  console.log("Deleting faculty_subject_assignments...");
  await db.delete(facultySubjectAssignments);

  console.log("Deleting timetable_slots...");
  await db.delete(timetableSlots);

  console.log("✅ Cleanup completed successfully.");

  console.log("⏳ Populating timetable_slots with exact IMS slots...");

  const imsSlots = [
    { slotNumber: 1, label: "Slot 1", startTime: "07:55:00", endTime: "08:50:00", isBreak: false },
    { slotNumber: 2, label: "Slot 2", startTime: "08:50:00", endTime: "09:40:00", isBreak: false },
    { slotNumber: 3, label: "Break",  startTime: "09:40:00", endTime: "09:50:00", isBreak: true  },
    { slotNumber: 4, label: "Slot 3", startTime: "09:50:00", endTime: "10:40:00", isBreak: false },
    { slotNumber: 5, label: "Slot 4", startTime: "10:40:00", endTime: "11:30:00", isBreak: false },
    { slotNumber: 6, label: "Slot 5", startTime: "11:30:00", endTime: "12:20:00", isBreak: false },
  ];

  await db.insert(timetableSlots).values(imsSlots);

  console.log("✅ timetable_slots populated successfully!");

  const slots = await db.select().from(timetableSlots);
  console.log("=== UPDATED TIMETABLE SLOTS IN DATABASE ===");
  slots.forEach(s => {
    console.log(`ID: ${s.id}, Slot: ${s.slotNumber}, Label: ${s.label}, Time: ${s.startTime}-${s.endTime}, isBreak: ${s.isBreak}`);
  });
  console.log("=========================================");
}

main().catch(console.error);
