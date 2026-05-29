-- =============================================
-- 0013: Exam Workflow — Multi-step creation tables
-- =============================================

-- 1. Extend internal_exams with wizard fields
ALTER TABLE "internal_exams"
  ADD COLUMN IF NOT EXISTS "academic_year_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "exam_type" VARCHAR(20) NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "completed_step" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS "ie_status_idx" ON "internal_exams"("status");

-- 2. exam_scopes — Step 2: targeted divisions
CREATE TABLE IF NOT EXISTS "exam_scopes" (
  "id" SERIAL PRIMARY KEY,
  "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
  "division_id" INTEGER NOT NULL REFERENCES "divisions"("id"),
  "year_label" INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "es_exam_div_idx" ON "exam_scopes"("exam_id", "division_id");
CREATE INDEX IF NOT EXISTS "es_exam_idx" ON "exam_scopes"("exam_id");

-- 3. exam_eligibility_rules — Step 3: per-year attendance rules
CREATE TABLE IF NOT EXISTS "exam_eligibility_rules" (
  "id" SERIAL PRIMARY KEY,
  "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
  "year_label" INTEGER NOT NULL,
  "min_attendance_percent" INTEGER NOT NULL DEFAULT 75,
  "allow_approval_override" BOOLEAN NOT NULL DEFAULT false,
  "approval_deadline" DATE
);
CREATE UNIQUE INDEX IF NOT EXISTS "eer_exam_year_idx" ON "exam_eligibility_rules"("exam_id", "year_label");
CREATE INDEX IF NOT EXISTS "eer_exam_idx" ON "exam_eligibility_rules"("exam_id");

-- 4. exam_subjects — Step 4: selected subjects with durations
CREATE TABLE IF NOT EXISTS "exam_subjects" (
  "id" SERIAL PRIMARY KEY,
  "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
  "subject_id" INTEGER NOT NULL REFERENCES "subjects"("id"),
  "duration_minutes" INTEGER NOT NULL DEFAULT 60
);
CREATE UNIQUE INDEX IF NOT EXISTS "esub_exam_sub_idx" ON "exam_subjects"("exam_id", "subject_id");
CREATE INDEX IF NOT EXISTS "esub_exam_idx" ON "exam_subjects"("exam_id");

-- 5. exam_schedules — Step 5: date + time slot + subject
CREATE TABLE IF NOT EXISTS "exam_schedules" (
  "id" SERIAL PRIMARY KEY,
  "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
  "exam_date" DATE NOT NULL,
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "exam_subject_id" INTEGER NOT NULL REFERENCES "exam_subjects"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "esch_exam_idx" ON "exam_schedules"("exam_id");
CREATE INDEX IF NOT EXISTS "esch_exam_date_idx" ON "exam_schedules"("exam_id", "exam_date");
CREATE UNIQUE INDEX IF NOT EXISTS "esch_exam_sub_idx" ON "exam_schedules"("exam_id", "exam_subject_id");

-- 6. exam_hall_allocations — Step 6: room ordering
CREATE TABLE IF NOT EXISTS "exam_hall_allocations" (
  "id" SERIAL PRIMARY KEY,
  "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
  "classroom_id" INTEGER NOT NULL REFERENCES "classrooms"("id"),
  "sequence_order" INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "eha_exam_room_idx" ON "exam_hall_allocations"("exam_id", "classroom_id");
CREATE INDEX IF NOT EXISTS "eha_exam_idx" ON "exam_hall_allocations"("exam_id");
