import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  console.log("1. Adding start_time column...");
  await sql`ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "start_time" time`;
  console.log("  ✓ OK");

  console.log("2. Adding end_time column...");
  await sql`ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "end_time" time`;
  console.log("  ✓ OK");

  console.log("3. Backfilling from timetable_entries...");
  await sql`
    UPDATE "attendance_sessions" AS s
    SET start_time = t.start_time, end_time = t.end_time
    FROM "timetable_entries" AS t
    WHERE s.timetable_id = t.id AND (s.start_time IS NULL OR s.end_time IS NULL)
  `;
  console.log("  ✓ OK");

  console.log("4. Setting defaults for orphaned rows...");
  await sql`UPDATE "attendance_sessions" SET start_time = '00:00' WHERE start_time IS NULL`;
  await sql`UPDATE "attendance_sessions" SET end_time = '00:00' WHERE end_time IS NULL`;
  console.log("  ✓ OK");

  console.log("5. Making columns NOT NULL...");
  await sql`ALTER TABLE "attendance_sessions" ALTER COLUMN "start_time" SET NOT NULL`;
  await sql`ALTER TABLE "attendance_sessions" ALTER COLUMN "end_time" SET NOT NULL`;
  console.log("  ✓ OK");

  console.log("6. Dropping old FK constraint...");
  try {
    await sql`ALTER TABLE "attendance_sessions" DROP CONSTRAINT IF EXISTS "attendance_sessions_timetable_id_timetable_entries_id_fk"`;
    console.log("  ✓ OK");
  } catch (e: any) {
    console.log("  ⚠ Skipped:", e.message?.substring(0, 60));
  }

  console.log("7. Making timetable_id nullable...");
  await sql`ALTER TABLE "attendance_sessions" ALTER COLUMN "timetable_id" DROP NOT NULL`;
  console.log("  ✓ OK");

  console.log("8. Recreating FK with ON DELETE SET NULL...");
  await sql`
    ALTER TABLE "attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_timetable_id_timetable_entries_id_fk"
    FOREIGN KEY ("timetable_id") REFERENCES "timetable_entries"("id") ON DELETE SET NULL
  `;
  console.log("  ✓ OK");

  console.log("9. Replacing unique index with regular index...");
  await sql`DROP INDEX IF EXISTS "as_timetable_date_idx"`;
  await sql`CREATE INDEX IF NOT EXISTS "as_timetable_date_idx" ON "attendance_sessions" ("timetable_id", "date")`;
  console.log("  ✓ OK");

  console.log("\n✅ Migration 0006 complete — attendance data is now preserved when timetable changes!");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
