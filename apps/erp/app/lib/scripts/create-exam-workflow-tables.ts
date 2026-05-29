import fs from "fs";
import path from "path";

// Load .env manually BEFORE importing any db dependencies
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function run() {
  console.log("Loading db module dynamically...");
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");

  // ─── Step 1: Extend internal_exams with wizard fields ──────────────────────
  console.log("[1/7] Extending internal_exams with wizard columns...");
  await db.execute(sql`
    ALTER TABLE "internal_exams"
      ADD COLUMN IF NOT EXISTS "academic_year_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "description" TEXT,
      ADD COLUMN IF NOT EXISTS "exam_type" VARCHAR(20) NOT NULL DEFAULT 'internal',
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS "completed_step" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "created_by_faculty_id" INTEGER REFERENCES "faculty"("id"),
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT NOW();
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "ie_status_idx" ON "internal_exams"("status");
  `);
  console.log("  ✓ internal_exams extended.");

  // ─── Step 2: exam_scopes ───────────────────────────────────────────────────
  console.log("[2/7] Creating exam_scopes table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "exam_scopes" (
      "id" SERIAL PRIMARY KEY,
      "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
      "division_id" INTEGER NOT NULL REFERENCES "divisions"("id"),
      "year_label" INTEGER NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "es_exam_div_idx" ON "exam_scopes"("exam_id", "division_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "es_exam_idx" ON "exam_scopes"("exam_id");
  `);
  console.log("  ✓ exam_scopes created.");

  // ─── Step 3: exam_eligibility_rules ────────────────────────────────────────
  console.log("[3/7] Creating exam_eligibility_rules table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "exam_eligibility_rules" (
      "id" SERIAL PRIMARY KEY,
      "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
      "year_label" INTEGER NOT NULL,
      "min_attendance_percent" INTEGER NOT NULL DEFAULT 75,
      "allow_approval_override" BOOLEAN NOT NULL DEFAULT false,
      "approval_deadline" DATE
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "eer_exam_year_idx" ON "exam_eligibility_rules"("exam_id", "year_label");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "eer_exam_idx" ON "exam_eligibility_rules"("exam_id");
  `);
  console.log("  ✓ exam_eligibility_rules created.");

  // ─── Step 4: exam_subjects ─────────────────────────────────────────────────
  console.log("[4/7] Creating exam_subjects table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "exam_subjects" (
      "id" SERIAL PRIMARY KEY,
      "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
      "subject_id" INTEGER NOT NULL REFERENCES "subjects"("id"),
      "duration_minutes" INTEGER NOT NULL DEFAULT 60
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "esub_exam_sub_idx" ON "exam_subjects"("exam_id", "subject_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "esub_exam_idx" ON "exam_subjects"("exam_id");
  `);
  console.log("  ✓ exam_subjects created.");

  // ─── Step 5: exam_schedules ────────────────────────────────────────────────
  console.log("[5/7] Creating exam_schedules table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "exam_schedules" (
      "id" SERIAL PRIMARY KEY,
      "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
      "exam_date" DATE NOT NULL,
      "start_time" TIME NOT NULL,
      "end_time" TIME NOT NULL,
      "exam_subject_id" INTEGER NOT NULL REFERENCES "exam_subjects"("id") ON DELETE CASCADE
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "esch_exam_idx" ON "exam_schedules"("exam_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "esch_exam_date_idx" ON "exam_schedules"("exam_id", "exam_date");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "esch_exam_sub_idx" ON "exam_schedules"("exam_id", "exam_subject_id");
  `);
  console.log("  ✓ exam_schedules created.");

  // ─── Step 6: exam_hall_allocations ─────────────────────────────────────────
  console.log("[6/7] Creating exam_hall_allocations table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "exam_hall_allocations" (
      "id" SERIAL PRIMARY KEY,
      "exam_id" INTEGER NOT NULL REFERENCES "internal_exams"("id") ON DELETE CASCADE,
      "classroom_id" INTEGER NOT NULL REFERENCES "classrooms"("id"),
      "sequence_order" INTEGER NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "eha_exam_room_idx" ON "exam_hall_allocations"("exam_id", "classroom_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "eha_exam_idx" ON "exam_hall_allocations"("exam_id");
  `);
  console.log("  ✓ exam_hall_allocations created.");

  // ─── Step 7: Backfill created_by_faculty_id for existing rows ──────────────
  console.log("[7/7] Backfilling created_by_faculty_id for existing rows...");
  await db.execute(sql`
    UPDATE "internal_exams"
    SET "created_by_faculty_id" = (
      SELECT "id" FROM "faculty" WHERE "is_active" = true LIMIT 1
    )
    WHERE "created_by_faculty_id" IS NULL;
  `);
  console.log("  ✓ Backfill complete.");

  console.log("\n✅ Exam workflow migration completed successfully!");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
