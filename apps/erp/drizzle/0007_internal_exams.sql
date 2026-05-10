-- =============================================
-- 0007: Internal Exams, Marks & Evaluations
-- =============================================

-- 1. internal_exams — exam definitions created by HOD
CREATE TABLE "internal_exams" (
  "id" SERIAL PRIMARY KEY,
  "semester_id" INTEGER NOT NULL REFERENCES "semesters"("id"),
  "exam_name" VARCHAR(100) NOT NULL,
  "exam_number" INTEGER NOT NULL,
  "target_type" VARCHAR(20) NOT NULL DEFAULT 'ALL',
  "target_year" INTEGER,
  "target_division_id" INTEGER REFERENCES "divisions"("id"),
  "created_by_faculty_id" INTEGER NOT NULL REFERENCES "faculty"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "ie_sem_idx" ON "internal_exams"("semester_id");
CREATE INDEX "ie_sem_num_idx" ON "internal_exams"("semester_id", "exam_number");

-- 2. internal_exam_marks — per-student per-subject marks per exam
CREATE TABLE "internal_exam_marks" (
  "id" SERIAL PRIMARY KEY,
  "internal_exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
  "assignment_id" INTEGER NOT NULL REFERENCES "faculty_subject_assignments"("id"),
  "student_id" INTEGER NOT NULL REFERENCES "students"("id"),

  "theory_marks" DECIMAL(6,2),
  "practical_marks" DECIMAL(6,2),

  "is_draft" BOOLEAN NOT NULL DEFAULT true,
  "is_visible" BOOLEAN NOT NULL DEFAULT false,

  "student_name" VARCHAR(150) NOT NULL,
  "subject_name" VARCHAR(100) NOT NULL,
  "division_name" VARCHAR(50) NOT NULL,

  "updated_by_faculty_id" INTEGER REFERENCES "faculty"("id"),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "iem_exam_assign_student_idx"
  ON "internal_exam_marks"("internal_exam_id", "assignment_id", "student_id");
CREATE INDEX "iem_assign_exam_idx"
  ON "internal_exam_marks"("assignment_id", "internal_exam_id");
CREATE INDEX "iem_student_idx"
  ON "internal_exam_marks"("student_id");

-- 3. internal_evaluations — final authoritative internal marks
CREATE TABLE "internal_evaluations" (
  "id" SERIAL PRIMARY KEY,
  "assignment_id" INTEGER NOT NULL REFERENCES "faculty_subject_assignments"("id"),
  "student_id" INTEGER NOT NULL REFERENCES "students"("id"),
  "semester_id" INTEGER NOT NULL REFERENCES "semesters"("id"),

  "final_theory_marks" DECIMAL(6,2),
  "final_practical_marks" DECIMAL(6,2),
  "is_finalized" BOOLEAN NOT NULL DEFAULT false,

  "student_name" VARCHAR(150) NOT NULL,
  "subject_name" VARCHAR(100) NOT NULL,
  "subject_type" VARCHAR(20) NOT NULL,
  "division_name" VARCHAR(50) NOT NULL,

  "finalized_by_faculty_id" INTEGER REFERENCES "faculty"("id"),
  "finalized_at" TIMESTAMP,
  "updated_by_faculty_id" INTEGER REFERENCES "faculty"("id"),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "iev_assign_student_sem_idx"
  ON "internal_evaluations"("assignment_id", "student_id", "semester_id");
CREATE INDEX "iev_assign_sem_idx"
  ON "internal_evaluations"("assignment_id", "semester_id");
