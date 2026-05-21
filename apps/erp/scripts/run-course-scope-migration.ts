import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

const BCA_COURSE_ID = 2; // Confirmed from DB: courses.id = 2 for BCA

async function runMigration() {
  console.log("=== COURSE SCOPE MIGRATION ===");
  console.log(`Backfill target: course_id = ${BCA_COURSE_ID} (BCA)\n`);

  // ─── Step 1: Add nullable course_id column to faculty ─────────────────────
  console.log("1. Adding nullable course_id column to faculty table...");
  await sql`
    ALTER TABLE "faculty"
    ADD COLUMN IF NOT EXISTS "course_id" INTEGER REFERENCES "courses"("id")
  `;
  console.log("   ✓ Column added (nullable)");

  // ─── Step 2: Backfill all existing faculty to BCA (course_id = 2) ─────────
  console.log(`\n2. Backfilling all faculty to course_id = ${BCA_COURSE_ID}...`);
  const result = await sql`
    UPDATE "faculty"
    SET "course_id" = ${BCA_COURSE_ID}
    WHERE "course_id" IS NULL
  `;
  console.log(`   ✓ Updated ${result.count} faculty rows`);

  // ─── Step 3: Enforce NOT NULL ──────────────────────────────────────────────
  console.log("\n3. Applying NOT NULL constraint on faculty.course_id...");
  await sql`ALTER TABLE "faculty" ALTER COLUMN "course_id" SET NOT NULL`;
  console.log("   ✓ NOT NULL enforced");

  // ─── Step 4: Verify ───────────────────────────────────────────────────────
  console.log("\n4. Verifying — faculty without course_id:");
  const [check] = await sql`
    SELECT COUNT(*) as nulls FROM "faculty" WHERE "course_id" IS NULL
  `;
  const nullCount = Number(check.nulls);
  if (nullCount === 0) {
    console.log("   ✓ All faculty have course_id set. No nulls.");
  } else {
    console.error(`   ✗ ${nullCount} faculty rows still have NULL course_id!`);
    process.exit(1);
  }

  // ─── Step 5: Also ensure subjects have course_id set ──────────────────────
  console.log(`\n5. Backfilling subjects.course_id = ${BCA_COURSE_ID} where NULL...`);
  const subjResult = await sql`
    UPDATE "subjects"
    SET "course_id" = ${BCA_COURSE_ID}
    WHERE "course_id" IS NULL
  `;
  console.log(`   ✓ Updated ${subjResult.count} subject rows`);

  console.log("\n=== COURSE SCOPE MIGRATION COMPLETE ✅ ===");
  await sql.end();
}

runMigration().catch((err) => {
  console.error("\nMigration failed:", err.message);
  sql.end();
  process.exit(1);
});
