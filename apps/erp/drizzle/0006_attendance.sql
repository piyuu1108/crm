-- Add startTime and endTime to attendance_sessions (denormalized from timetable)
ALTER TABLE "attendance_sessions" ADD COLUMN "start_time" time;
ALTER TABLE "attendance_sessions" ADD COLUMN "end_time" time;

-- Backfill startTime/endTime from timetable_entries for existing sessions
UPDATE "attendance_sessions" AS s
  SET start_time = t.start_time, end_time = t.end_time
  FROM "timetable_entries" AS t
  WHERE s.timetable_id = t.id;

-- Set defaults for any orphaned rows, then make NOT NULL
UPDATE "attendance_sessions" SET start_time = '00:00' WHERE start_time IS NULL;
UPDATE "attendance_sessions" SET end_time = '00:00' WHERE end_time IS NULL;
ALTER TABLE "attendance_sessions" ALTER COLUMN "start_time" SET NOT NULL;
ALTER TABLE "attendance_sessions" ALTER COLUMN "end_time" SET NOT NULL;

-- Add marked_by_faculty_id column
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "marked_by_faculty_id" integer REFERENCES "faculty"("id");

-- Make timetable_id nullable (drop old FK, recreate with ON DELETE SET NULL)
ALTER TABLE "attendance_sessions" DROP CONSTRAINT IF EXISTS "attendance_sessions_timetable_id_timetable_entries_id_fk";
ALTER TABLE "attendance_sessions" ALTER COLUMN "timetable_id" DROP NOT NULL;
ALTER TABLE "attendance_sessions"
  ADD CONSTRAINT "attendance_sessions_timetable_id_timetable_entries_id_fk"
  FOREIGN KEY ("timetable_id") REFERENCES "timetable_entries"("id") ON DELETE SET NULL;

-- Replace unique index with regular index (timetable_id can be NULL now)
DROP INDEX IF EXISTS "as_timetable_date_idx";
CREATE INDEX "as_timetable_date_idx" ON "attendance_sessions" ("timetable_id", "date");
