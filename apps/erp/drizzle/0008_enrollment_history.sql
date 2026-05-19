-- ============================================================================
-- Migration: Student Enrollment History + Academic Years
-- Purpose: Add auditable enrollment tracking without disrupting existing modules
-- Safe: All changes are additive (new tables + nullable column)
-- ============================================================================

-- 1. Create academic_years table
CREATE TABLE "academic_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(20) NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "academic_years_name_unique" UNIQUE("name")
);

--> statement-breakpoint

-- 2. Add academic_year_id FK to existing semesters table (nullable for backward compat)
ALTER TABLE "semesters"
	ADD COLUMN "academic_year_id" integer;
--> statement-breakpoint
ALTER TABLE "semesters"
	ADD CONSTRAINT "semesters_academic_year_id_academic_years_id_fk"
	FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id")
	ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- 3. Create student_enrollment_history table
CREATE TABLE "student_enrollment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"academic_year_id" integer NOT NULL,
	"semester_no" integer NOT NULL,
	"division_name" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

--> statement-breakpoint

-- 4. Foreign keys for student_enrollment_history
ALTER TABLE "student_enrollment_history"
	ADD CONSTRAINT "seh_student_id_fk"
	FOREIGN KEY ("student_id") REFERENCES "public"."students"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "student_enrollment_history"
	ADD CONSTRAINT "seh_semester_id_fk"
	FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "student_enrollment_history"
	ADD CONSTRAINT "seh_division_id_fk"
	FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "student_enrollment_history"
	ADD CONSTRAINT "seh_academic_year_id_fk"
	FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id")
	ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

-- 5. Indexes for student_enrollment_history
CREATE UNIQUE INDEX "seh_student_semester_idx"
	ON "student_enrollment_history" USING btree ("student_id", "semester_id");
--> statement-breakpoint
CREATE INDEX "seh_student_status_idx"
	ON "student_enrollment_history" USING btree ("student_id", "status");
--> statement-breakpoint
CREATE INDEX "seh_acad_year_idx"
	ON "student_enrollment_history" USING btree ("academic_year_id");
--> statement-breakpoint
CREATE INDEX "seh_division_idx"
	ON "student_enrollment_history" USING btree ("division_id");

--> statement-breakpoint

-- ============================================================================
-- DATA BACKFILL: Initial state — all classes in odd semesters of 2026-27
-- ============================================================================

-- 6. Create the current academic year
INSERT INTO "academic_years" ("name", "start_year", "end_year", "is_current")
VALUES ('2026-27', 2026, 2027, true);

--> statement-breakpoint

-- 7. Link all existing semesters to the 2026-27 academic year
UPDATE "semesters"
SET "academic_year_id" = (SELECT "id" FROM "academic_years" WHERE "name" = '2026-27')
WHERE "academic_year_id" IS NULL;

--> statement-breakpoint

-- 8. Backfill enrollment history for every student who has a current_division_id
--    These are all currently active students — they get one 'active' enrollment row.
INSERT INTO "student_enrollment_history"
	("student_id", "semester_id", "division_id", "academic_year_id", "semester_no", "division_name", "status", "enrolled_at")
SELECT
	s."id",
	d."semester_id",
	d."id",
	(SELECT "id" FROM "academic_years" WHERE "name" = '2026-27'),
	d."semester_no",
	d."display_name",
	'active',
	s."created_at"
FROM "students" s
INNER JOIN "divisions" d ON s."current_division_id" = d."id"
WHERE s."current_division_id" IS NOT NULL;
