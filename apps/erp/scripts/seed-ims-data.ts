import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import { db } from "../app/lib/db";
import {
  faculty,
  divisions,
  subjects,
  courses,
  semesters,
} from "../app/lib/schema";
import { eq, sql } from "drizzle-orm";

// -- Simple CSV Parser --
function parseCSV(content: string) {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
  
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Quick regex to handle commas inside quotes
    const values = line.match(/(?:\"([^\"]*)\")|([^\,]+)/g) || [];
    const obj: any = {};
    headers.forEach((header, index) => {
      let val = values[index] ? values[index].trim() : "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      obj[header] = val;
    });
    result.push(obj);
  }
  return result;
}

async function seedData() {
  console.log("🌱 Starting IMS to ERP Seeding Process...");
  
  const exportsDir = path.join(__dirname, "../../ims/exports");
  
  const facultyPath = path.join(exportsDir, "faculty.csv");
  const classesPath = path.join(exportsDir, "classes.csv");
  const subjectsPath = path.join(exportsDir, "subjects.csv");

  if (!fs.existsSync(facultyPath) || !fs.existsSync(classesPath) || !fs.existsSync(subjectsPath)) {
    console.error("❌ Export files not found! Make sure to run the IMS export script first.");
    process.exit(1);
  }

  const facultyData = parseCSV(fs.readFileSync(facultyPath, "utf-8"));
  const classesData = parseCSV(fs.readFileSync(classesPath, "utf-8"));
  const subjectsData = parseCSV(fs.readFileSync(subjectsPath, "utf-8"));

  const defaultPasswordHash = await bcrypt.hash("pass@123", 10);

  // -- Generate Unique Mobile --
  let baseMobile = 9000000000;
  const getUniqueMobile = () => {
    baseMobile += 1;
    return baseMobile.toString();
  };

  // Neon-http does not support transactions
  // 1. COURSES & SEMESTERS (Prerequisites for Classes/Subjects)
  console.log("📦 Provisioning Master Courses & Semesters...");
    
    // Extract unique courses from classes
    const uniqueCourses = Array.from(new Set(classesData.map(c => c.course)));
    const courseMap = new Map<string, number>();

    for (const cName of uniqueCourses) {
      if (!cName) continue;
      // Upsert Course
      const insertedCourse = await db.insert(courses)
        .values({
          name: cName,
          code: cName.toUpperCase() + "_CODE",
          totalSems: 6,
        })
        .onConflictDoUpdate({
          target: courses.code,
          set: { name: cName }
        })
        .returning({ id: courses.id });
      
      courseMap.set(cName, insertedCourse[0].id);
    }

    // Extract unique semesters from classes
    const uniqueSems = Array.from(new Set(classesData.map(c => parseInt(c.semester, 10)).filter(s => !isNaN(s))));
    const semMap = new Map<number, number>();

    for (const semNo of uniqueSems) {
      const semName = `Semester ${semNo}`;
      // Basic Upsert pattern for Semester (assuming name is unique enough for this script's scope, we use a simple approach)
      // Since semesters doesn't have a unique constraint on name, we select first.
      let existingSem = await db.select().from(semesters).where(eq(semesters.name, semName));
      if (existingSem.length === 0) {
        existingSem = await db.insert(semesters).values({
          name: semName,
          startDate: new Date("2026-01-01").toISOString(),
          endDate: new Date("2026-06-30").toISOString(),
          isActive: true,
        }).returning();
      }
      semMap.set(semNo, existingSem[0].id);
    }

    // 2. FACULTY
    console.log("👨‍🏫 Seeding Faculty...");
    let facAdded = 0;
    let facSkipped = 0;

    for (const row of facultyData) {
      const code = row.code;
      const existing = await db.select().from(faculty).where(eq(faculty.facultyCode, code));
      
      if (existing.length > 0) {
        facSkipped++;
        continue;
      }

      await db.insert(faculty).values({
        facultyCode: code,
        name: row.name,
        email: `${code.toLowerCase().replace(/[^a-z0-9]/g, '')}@pipy.site`,
        mobile: getUniqueMobile(),
        passwordHash: defaultPasswordHash,
        mustChangePwd: true,
        isActive: true,
      });
      facAdded++;
    }
    console.log(`   → ${facAdded} inserted, ${facSkipped} skipped (already existed).`);

    // 3. DIVISIONS (Classes)
    console.log("🏫 Seeding Classes (Divisions)...");
    let divAdded = 0;

    for (const row of classesData) {
      const semNo = parseInt(row.semester, 10);
      const semId = semMap.get(semNo);
      const cId = courseMap.get(row.course);

      if (!semId || !cId) {
        console.warn(`   ⚠️ Skipping class ${row.name} due to missing sem/course resolution.`);
        continue;
      }

      // We rely on divisions_batch_divno_idx, but displayName is permanent.
      const existing = await db.select().from(divisions).where(eq(divisions.displayName, row.name));
      if (existing.length === 0) {
        await db.insert(divisions).values({
          semesterId: semId,
          courseId: cId,
          courseCode: row.course,
          courseName: row.course,
          specialization: row.specializationShortCode || row.specialization || "REGULAR",
          batchYear: parseInt(row.year, 10),
          semesterNo: semNo,
          divisionNo: parseInt(row.divisionNumber, 10),
          displayName: row.name,
          maxCapacity: 60,
          publishStatus: "draft",
        });
        divAdded++;
      }
    }
    console.log(`   → ${divAdded} classes inserted/verified.`);

    // 4. SUBJECTS
    console.log("📚 Seeding Subjects...");
    let subAdded = 0;
    let subUpdated = 0;

    for (const row of subjectsData) {
      const cId = courseMap.get(row.course) || null;
      
      await db.insert(subjects)
        .values({
          name: row.name,
          code: row.code,
          shortCode: row.shortCode,
          subjectType: row.type?.toLowerCase() === "theory" ? "theory" : row.type?.toLowerCase() === "practical" ? "practical" : "both",
          credit: parseInt(row.credit, 10) || 0,
          semester: parseInt(row.semester, 10) || 0,
          courseId: cId,
        })
        .onConflictDoUpdate({
          target: subjects.code,
          set: {
            name: row.name,
            shortCode: row.shortCode,
            credit: parseInt(row.credit, 10) || 0,
            semester: parseInt(row.semester, 10) || 0,
            courseId: cId,
          }
        });
      subAdded++;
    }
    console.log(`   → ${subAdded} subjects upserted.`);
  
  console.log("🎉 Seeding completed successfully!");
}

seedData().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
