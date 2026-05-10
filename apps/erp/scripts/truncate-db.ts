import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Load .env manually to ensure DATABASE_URL is available
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0];
      let value = parts.slice(1).join("=").trim();
      // Strip surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key && value && !process.env[key]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

// All tables in the schema — order doesn't matter because we use CASCADE
const ALL_TABLES = [
  "internal_evaluations",
  "internal_exam_marks",
  "internal_exams",
  "circulars",
  "audit_logs",
  "student_requests",
  "marks",
  "attendance",
  "attendance_sessions",
  "timetable_entries",
  "counselor_division_assignments",
  "faculty_subject_assignments",
  "student_prior_education",
  "student_documents",
  "students",
  "faculty_roles",
  "faculty_documents",
  "faculty_professional_info",
  "faculty_contact_info",
  "faculty_personal_info",
  "faculty",
  "divisions",
  "subjects",
  "semesters",
  "courses",
  "roles",
];

async function truncateAll() {
  console.log("⚠️  WARNING: This will DELETE ALL DATA from every table!");
  console.log("   Schema (tables, columns, indexes) will be preserved.\n");

  const tableList = ALL_TABLES.join(", ");

  console.log(`Truncating ${ALL_TABLES.length} tables...\n`);

  // Single TRUNCATE with CASCADE handles all FK dependencies at once
  // RESTART IDENTITY resets all serial/auto-increment counters back to 1
  // neon() returns a tagged template function — use backticks, not parens.
  // Table names are static/trusted so string interpolation here is safe.
  await sql`TRUNCATE TABLE ${sql.unsafe(tableList)} RESTART IDENTITY CASCADE`;

  for (const table of ALL_TABLES) {
    console.log(`  ✅ ${table} — truncated`);
  }

  console.log(`\n🗑️  Done! All ${ALL_TABLES.length} tables have been emptied.`);
  console.log("   Schema is intact. Run seed-hod.ts to re-seed base data.");
  process.exit(0);
}

truncateAll().catch((err) => {
  console.error("❌ Truncation failed:", err);
  process.exit(1);
});
