-- ============================================================================
-- Migration: Partial Schema Normalization
-- Purpose: Remove denormalized names and snapshots from operational tables
--          to reduce data redundancy and enforce data integrity.
-- ============================================================================

-- 1. faculty_subject_assignments
ALTER TABLE "faculty_subject_assignments" DROP COLUMN IF EXISTS "faculty_name";
ALTER TABLE "faculty_subject_assignments" DROP COLUMN IF EXISTS "subject_name";
ALTER TABLE "faculty_subject_assignments" DROP COLUMN IF EXISTS "division_name";
ALTER TABLE "faculty_subject_assignments" DROP COLUMN IF EXISTS "course_code";

-- 2. counselor_division_assignments
ALTER TABLE "counselor_division_assignments" DROP COLUMN IF EXISTS "faculty_name";
ALTER TABLE "counselor_division_assignments" DROP COLUMN IF EXISTS "division_name";

-- 3. timetable_entries
ALTER TABLE "timetable_entries" DROP COLUMN IF EXISTS "subject_name";
ALTER TABLE "timetable_entries" DROP COLUMN IF EXISTS "faculty_name";
ALTER TABLE "timetable_entries" DROP COLUMN IF EXISTS "division_name";
ALTER TABLE "timetable_entries" DROP COLUMN IF EXISTS "course_code";

-- 4. attendance_sessions
ALTER TABLE "attendance_sessions" DROP COLUMN IF EXISTS "subject_name";
ALTER TABLE "attendance_sessions" DROP COLUMN IF EXISTS "faculty_name";
ALTER TABLE "attendance_sessions" DROP COLUMN IF EXISTS "division_name";

-- 5. student_enrollment_history
ALTER TABLE "student_enrollment_history" DROP COLUMN IF EXISTS "academic_year_id";
ALTER TABLE "student_enrollment_history" DROP COLUMN IF EXISTS "semester_no";
ALTER TABLE "student_enrollment_history" DROP COLUMN IF EXISTS "division_name";
-- Drop indexes that relied on the dropped columns
DROP INDEX IF EXISTS "seh_acad_year_idx";
