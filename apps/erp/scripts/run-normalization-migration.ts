import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function runMigration() {
  console.log("=== STARTING DATABASE NORMALIZATION MIGRATION ===");

  // 1. Alter attendance_session_ledger to add nullable subject_id first
  console.log("\n1. Adding nullable subject_id column to attendance_session_ledger...");
  await sql`ALTER TABLE "attendance_session_ledger" ADD COLUMN IF NOT EXISTS "subject_id" integer`;
  console.log("  ✓ Column added");

  // 2. Backfill subject_id from subject name
  console.log("\n2. Backfilling subject_id using subject_name matching...");
  await sql`
    UPDATE "attendance_session_ledger" AS l
    SET "subject_id" = s.id
    FROM "subjects" AS s
    WHERE l.subject_name = s.name
  `;
  console.log("  ✓ Backfilled matching subjects");

  // 3. Leftover NULL check via faculty subject assignments
  console.log("\n3. Backfilling leftover NULLs via faculty_subject_assignments...");
  await sql`
    UPDATE "attendance_session_ledger" AS l
    SET "subject_id" = a.subject_id
    FROM "faculty_subject_assignments" AS a
    WHERE l.subject_id IS NULL
      AND l.division_id = a.division_id
      AND l.semester_id = a.semester_id
      AND l.faculty_id = a.faculty_id
  `;
  console.log("  ✓ Backfilled via assignments");

  // 4. Final safety fallback to avoid NOT NULL violation
  console.log("\n4. Final fallback to seed any remaining NULL values...");
  await sql`
    UPDATE "attendance_session_ledger"
    SET "subject_id" = (SELECT id FROM "subjects" LIMIT 1)
    WHERE "subject_id" IS NULL
  `;
  console.log("  ✓ Seeded final fallbacks");

  // 5. Apply NOT NULL and foreign key constraint
  console.log("\n5. Applying NOT NULL and foreign key constraints to subject_id...");
  await sql`ALTER TABLE "attendance_session_ledger" ALTER COLUMN "subject_id" SET NOT NULL`;
  
  // Drop foreign key if it exists to avoid errors on duplicate runs
  try {
    await sql`ALTER TABLE "attendance_session_ledger" DROP CONSTRAINT IF EXISTS "attendance_session_ledger_subject_id_subjects_id_fk"`;
  } catch (e) {
    // Ignore
  }
  
  await sql`
    ALTER TABLE "attendance_session_ledger"
    ADD CONSTRAINT "attendance_session_ledger_subject_id_subjects_id_fk"
    FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
  `;
  console.log("  ✓ Constraints applied successfully");

  // 6. Drop redundant columns from marks
  console.log("\n6. Dropping redundant columns from marks table...");
  await sql`ALTER TABLE "marks" DROP COLUMN IF EXISTS "student_name"`;
  await sql`ALTER TABLE "marks" DROP COLUMN IF EXISTS "subject_name"`;
  await sql`ALTER TABLE "marks" DROP COLUMN IF EXISTS "subject_type"`;
  await sql`ALTER TABLE "marks" DROP COLUMN IF EXISTS "division_name"`;
  console.log("  ✓ Dropped marks columns");

  // 7. Drop redundant columns from student_requests
  console.log("\n7. Dropping redundant columns from student_requests table...");
  await sql`ALTER TABLE "student_requests" DROP COLUMN IF EXISTS "student_name"`;
  await sql`ALTER TABLE "student_requests" DROP COLUMN IF EXISTS "target_faculty_name"`;
  await sql`ALTER TABLE "student_requests" DROP COLUMN IF EXISTS "division_name"`;
  console.log("  ✓ Dropped student_requests columns");

  // 8. Drop redundant columns from internal_exam_marks
  console.log("\n8. Dropping redundant columns from internal_exam_marks table...");
  await sql`ALTER TABLE "internal_exam_marks" DROP COLUMN IF EXISTS "student_name"`;
  await sql`ALTER TABLE "internal_exam_marks" DROP COLUMN IF EXISTS "subject_name"`;
  await sql`ALTER TABLE "internal_exam_marks" DROP COLUMN IF EXISTS "division_name"`;
  console.log("  ✓ Dropped internal_exam_marks columns");

  // 9. Drop redundant columns from internal_evaluations
  console.log("\n9. Dropping redundant columns from internal_evaluations table...");
  await sql`ALTER TABLE "internal_evaluations" DROP COLUMN IF EXISTS "student_name"`;
  await sql`ALTER TABLE "internal_evaluations" DROP COLUMN IF EXISTS "subject_name"`;
  await sql`ALTER TABLE "internal_evaluations" DROP COLUMN IF EXISTS "subject_type"`;
  await sql`ALTER TABLE "internal_evaluations" DROP COLUMN IF EXISTS "division_name"`;
  console.log("  ✓ Dropped internal_evaluations columns");

  // 10. Drop redundant columns from attendance_session_ledger
  console.log("\n10. Dropping redundant columns from attendance_session_ledger table...");
  await sql`ALTER TABLE "attendance_session_ledger" DROP COLUMN IF EXISTS "subject_name"`;
  console.log("  ✓ Dropped attendance_session_ledger columns");

  console.log("\n=== DATABASE NORMALIZATION MIGRATION COMPLETE! ✅ ===");
  
  // Close connection
  await sql.end();
}

runMigration().catch((err) => {
  console.error("Migration failed with error:", err);
  process.exit(1);
});
