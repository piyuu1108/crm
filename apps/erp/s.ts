import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "P:/02_projects/erp/apps/client/app/lib/schema";
import fs from "fs";
import path from "path";
import { eq, inArray } from "drizzle-orm";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0];
      let value = parts.slice(1).join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key && value && !process.env[key]) process.env[key.trim()] = value;
    }
  });
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const TARGET_DIVISION = "24BCADSDIV1";

async function deleteStudentsByDivision() {
  console.log(`\n🔍 Looking up students in division: ${TARGET_DIVISION}...\n`);

  // Step 1: Find all students in the target division
  const targetStudents = await db
    .select({ id: schema.students.id, fullName: schema.students.fullName })
    .from(schema.students)
    .where(eq(schema.students.currentDivisionName, TARGET_DIVISION));

  if (targetStudents.length === 0) {
    console.log(`✅ No students found in division '${TARGET_DIVISION}'. Nothing to delete.`);
    process.exit(0);
  }

  const studentIds = targetStudents.map((s) => s.id);
  console.log(`Found ${studentIds.length} student(s):`);
  targetStudents.forEach((s) => console.log(`  - [${s.id}] ${s.fullName}`));
  console.log();

  // Step 2: Delete from all dependent tables (leaf tables first)

  // 2a. attendance (via attendanceSessions join — need session IDs for these students)
  //     attendance has a direct studentId FK, so we can delete directly
  const deletedAttendance = await db
    .delete(schema.attendance)
    .where(inArray(schema.attendance.studentId, studentIds))
    .returning({ id: schema.attendance.id });
  console.log(`🗑️  Deleted ${deletedAttendance.length} attendance record(s)`);

  // 2b. internalExamMarks
  const deletedIEM = await db
    .delete(schema.internalExamMarks)
    .where(inArray(schema.internalExamMarks.studentId, studentIds))
    .returning({ id: schema.internalExamMarks.id });
  console.log(`🗑️  Deleted ${deletedIEM.length} internal exam mark(s)`);

  // 2c. internalEvaluations
  const deletedIEV = await db
    .delete(schema.internalEvaluations)
    .where(inArray(schema.internalEvaluations.studentId, studentIds))
    .returning({ id: schema.internalEvaluations.id });
  console.log(`🗑️  Deleted ${deletedIEV.length} internal evaluation(s)`);

  // 2d. marks
  const deletedMarks = await db
    .delete(schema.marks)
    .where(inArray(schema.marks.studentId, studentIds))
    .returning({ id: schema.marks.id });
  console.log(`🗑️  Deleted ${deletedMarks.length} mark record(s)`);

  // 2e. studentRequests
  const deletedRequests = await db
    .delete(schema.studentRequests)
    .where(inArray(schema.studentRequests.studentId, studentIds))
    .returning({ id: schema.studentRequests.id });
  console.log(`🗑️  Deleted ${deletedRequests.length} student request(s)`);

  // 2f. studentDocuments
  const deletedDocs = await db
    .delete(schema.studentDocuments)
    .where(inArray(schema.studentDocuments.studentId, studentIds))
    .returning({ id: schema.studentDocuments.id });
  console.log(`🗑️  Deleted ${deletedDocs.length} student document(s)`);

  // 2g. studentPriorEducation
  const deletedPriorEdu = await db
    .delete(schema.studentPriorEducation)
    .where(inArray(schema.studentPriorEducation.studentId, studentIds))
    .returning({ id: schema.studentPriorEducation.id });
  console.log(`🗑️  Deleted ${deletedPriorEdu.length} prior education record(s)`);

  // Step 3: Finally delete the students themselves
  const deletedStudents = await db
    .delete(schema.students)
    .where(inArray(schema.students.id, studentIds))
    .returning({ id: schema.students.id, fullName: schema.students.fullName });

  console.log(`\n✅ Deleted ${deletedStudents.length} student(s) from '${TARGET_DIVISION}':`);
  deletedStudents.forEach((s) => console.log(`  - [${s.id}] ${s.fullName}`));
}

deleteStudentsByDivision()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Deletion failed:", err);
    process.exit(1);
  });