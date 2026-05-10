import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { faculty, classes, subjects, courses, specializations } from "../db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const connectionString = process.env.DATABASE_URL!;

// ─── CSV Helpers ──────────────────────────────────────────────────────

function escapeCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Wrap in quotes if contains comma, newline, or double-quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

function writeCSV(filename: string, content: string) {
  const outputDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content, "utf-8");
  console.log(`✅ Written: ${filepath}`);
  return filepath;
}

// ─── Main Export ──────────────────────────────────────────────────────

async function exportToCSV() {
  console.log("📦 Starting CSV export...");
  console.log("Connecting to:", connectionString.replace(/:[^:@]+@/, ":***@"));

  const client = postgres(connectionString, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
    connect_timeout: 30,
  });
  const db = drizzle(client);

  // ── Faculty ──────────────────────────────────────────────────────────
  console.log("\n📋 Fetching faculty...");
  const facultyRows = await db
    .select({
      id: faculty.id,
      name: faculty.name,
      code: faculty.code,
      course: courses.name,
      courseId: faculty.courseId,
      createdAt: faculty.createdAt,
    })
    .from(faculty)
    .leftJoin(courses, eq(faculty.courseId, courses.id))
    .orderBy(faculty.id);

  const facultyCSV = toCSV(facultyRows as Record<string, unknown>[]);
  writeCSV("faculty.csv", facultyCSV);
  console.log(`   → ${facultyRows.length} faculty records exported`);

  // ── Classes ──────────────────────────────────────────────────────────
  console.log("\n📋 Fetching classes...");
  const classRows = await db
    .select({
      id: classes.id,
      name: classes.name,
      year: classes.year,
      semester: classes.semester,
      divisionNumber: classes.divisionNumber,
      course: courses.name,
      courseId: classes.courseId,
      specialization: specializations.name,
      specializationShortCode: specializations.shortCode,
      specializationId: classes.specializationId,
      createdAt: classes.createdAt,
    })
    .from(classes)
    .leftJoin(courses, eq(classes.courseId, courses.id))
    .leftJoin(specializations, eq(classes.specializationId, specializations.id))
    .orderBy(classes.id);

  const classesCSV = toCSV(classRows as Record<string, unknown>[]);
  writeCSV("classes.csv", classesCSV);
  console.log(`   → ${classRows.length} class records exported`);

  // ── Subjects ─────────────────────────────────────────────────────────
  console.log("\n📋 Fetching subjects...");
  const subjectRows = await db
    .select({
      id: subjects.id,
      code: subjects.code,
      name: subjects.name,
      shortCode: subjects.shortCode,
      credit: subjects.credit,
      type: subjects.type,
      semester: subjects.semester,
      course: courses.name,
      courseId: subjects.courseId,
      createdAt: subjects.createdAt,
    })
    .from(subjects)
    .leftJoin(courses, eq(subjects.courseId, courses.id))
    .orderBy(subjects.id);

  const subjectsCSV = toCSV(subjectRows as Record<string, unknown>[]);
  writeCSV("subjects.csv", subjectsCSV);
  console.log(`   → ${subjectRows.length} subject records exported`);

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log("\n🎉 Export complete!");
  console.log(`   faculty.csv   → ${facultyRows.length} rows`);
  console.log(`   classes.csv   → ${classRows.length} rows`);
  console.log(`   subjects.csv  → ${subjectRows.length} rows`);

  await client.end();
}

exportToCSV().catch((err) => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});