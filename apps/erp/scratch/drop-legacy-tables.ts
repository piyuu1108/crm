import { db } from "@/app/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Dropping legacy attendance tables...");
  try {
    await db.execute(sql`DROP TABLE IF EXISTS attendance CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS attendance_sessions CASCADE;`);
    console.log("Dropped attendance and attendance_sessions tables successfully.");
  } catch (error) {
    console.error("Failed to drop legacy tables:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
