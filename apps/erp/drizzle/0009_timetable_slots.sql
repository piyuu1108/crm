-- ============================================================================
-- Migration: Timetable Slots + Slot Identity
-- Purpose: Add institution-wide timetable slot definitions and link to entries
-- Safe: All changes are additive (new table + nullable column)
-- ============================================================================

-- 1. Create timetable_slots master table
CREATE TABLE "timetable_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_number" integer NOT NULL,
	"label" varchar(30) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_break" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "timetable_slots_slot_number_unique" UNIQUE("slot_number")
);

--> statement-breakpoint

-- 2. Seed the 5 lecture slots + 1 break for the institution
--    Slot 1: 07:50 – 08:40
--    Slot 2: 08:40 – 09:20
--    Break:  09:20 – 09:30 (10 min)
--    Slot 3: 09:30 – 10:20
--    Slot 4: 10:20 – 11:30
--    Slot 5: 11:30 – 12:20
INSERT INTO "timetable_slots" ("slot_number", "label", "start_time", "end_time", "is_break")
VALUES
  (1, 'Slot 1', '07:50:00', '08:40:00', false),
  (2, 'Slot 2', '08:40:00', '09:20:00', false),
  (3, 'Break',  '09:20:00', '09:30:00', true),
  (4, 'Slot 3', '09:30:00', '10:20:00', false),
  (5, 'Slot 4', '10:20:00', '11:30:00', false),
  (6, 'Slot 5', '11:30:00', '12:20:00', false);

--> statement-breakpoint

-- 3. Add slot_id column to timetable_entries (nullable for backward compat)
ALTER TABLE "timetable_entries"
	ADD COLUMN "slot_id" integer;
--> statement-breakpoint
ALTER TABLE "timetable_entries"
	ADD CONSTRAINT "timetable_entries_slot_id_timetable_slots_id_fk"
	FOREIGN KEY ("slot_id") REFERENCES "public"."timetable_slots"("id")
	ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- 4. Index on slot_id for fast lookups
CREATE INDEX "te_slot_idx" ON "timetable_entries" USING btree ("slot_id");

--> statement-breakpoint

-- 5. Backfill slot_id for existing entries that match slot times exactly
UPDATE "timetable_entries" te
SET "slot_id" = ts."id"
FROM "timetable_slots" ts
WHERE te."start_time" = ts."start_time"
  AND te."end_time" = ts."end_time"
  AND ts."is_break" = false
  AND te."is_active" = true;

--> statement-breakpoint

-- 6. Deactivate entries that don't align with any valid slot
--    (These are non-standard/test entries that don't match institutional timings)
UPDATE "timetable_entries"
SET "is_active" = false
WHERE "is_active" = true
  AND "slot_id" IS NULL;
