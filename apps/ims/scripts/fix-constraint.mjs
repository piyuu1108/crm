import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
});

try {
  await sql`ALTER TABLE assignments DROP CONSTRAINT IF EXISTS uniq_assignment`;
  console.log("Dropped old constraint (subjectId, classId, facultyId)");

  await sql`ALTER TABLE assignments ADD CONSTRAINT uniq_assignment UNIQUE(subject_id, class_id)`;
  console.log("Added new constraint (subjectId, classId) — 1 faculty per cell enforced");

  await sql.end();
  console.log("Done.");
} catch (e) {
  console.error("Migration failed:", e.message);
  await sql.end();
  process.exit(1);
}
