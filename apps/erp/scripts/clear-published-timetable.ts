import { db } from "@/app/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Clearing published timetable data (timetable entries, assignments, and lab rooms)...");
  try {
    // 1. Delete all timetable entries
    await db.execute(sql`DELETE FROM timetable_entries;`);
    console.log("Cleared all timetable_entries successfully.");

    // 2. Delete all faculty-subject assignments
    await db.execute(sql`DELETE FROM faculty_subject_assignments;`);
    console.log("Cleared all faculty_subject_assignments successfully.");

    // 3. Delete rooms registered as labs
    await db.execute(sql`DELETE FROM rooms WHERE is_lab = true;`);
    console.log("Cleared all lab rooms successfully.");

  } catch (error) {
    console.error("Failed to clear published timetable data:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
