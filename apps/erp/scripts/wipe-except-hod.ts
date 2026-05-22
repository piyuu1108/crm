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

const FULL_WIPE_TABLES = [
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
  "divisions",
  "subjects",
];

async function wipeExceptHod() {
  console.log("⚠️  WARNING: This will DELETE ALL DATA except HODs and base config (semesters/courses/roles).");
  
  // 1. Truncate all downstream transaction/academic tables
  console.log(`\nTruncating ${FULL_WIPE_TABLES.length} academic & transaction tables...`);
  await sql`TRUNCATE TABLE ${sql.unsafe(FULL_WIPE_TABLES.join(", "))} CASCADE`;
  
  // 2. Identify HODs
  const hodIds = await sql`
    SELECT f.id 
    FROM faculty f
    JOIN faculty_roles fr ON f.id = fr.faculty_id
    JOIN roles r ON fr.role_id = r.id
    WHERE r.name = 'hod'
  `;
  
  const ids = hodIds.map(h => h.id);
  console.log(`\nFound ${ids.length} HOD(s) to preserve: ${ids.join(", ")}`);
  
  if (ids.length > 0) {
    const idsStr = ids.join(",");
    console.log("Removing all other faculty...");
    
    // Delete related faculty data first for non-HODs
    await sql`DELETE FROM faculty_roles WHERE faculty_id NOT IN (${sql.unsafe(idsStr)})`;

    // Delete the faculty themselves
    await sql`DELETE FROM faculty WHERE id NOT IN (${sql.unsafe(idsStr)})`;
  } else {
    console.log("No HODs found. Wiping all faculty...");
    await sql`TRUNCATE TABLE faculty CASCADE`;
  }

  console.log("\n🗑️  Done! System wiped except HODs, Semesters, Courses, and Roles.");
  process.exit(0);
}

wipeExceptHod().catch((err) => {
  console.error("❌ Wipe failed:", err);
  process.exit(1);
});
