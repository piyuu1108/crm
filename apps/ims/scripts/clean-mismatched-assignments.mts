import { db } from "../src/db/index.js";
import { assignments, subjects, classes } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  const allAssignments = await db.select({
    id: assignments.id,
    subjectId: assignments.subjectId,
    classId: assignments.classId,
    subjectSem: subjects.semester,
    classSem: classes.semester,
  })
  .from(assignments)
  .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
  .innerJoin(classes, eq(assignments.classId, classes.id));

  const mismatched = allAssignments.filter(a => a.subjectSem !== a.classSem);
  
  console.log(`Found ${mismatched.length} mismatched assignments`);
  
  for (const m of mismatched) {
    console.log(`Deleting assignment ID ${m.id} (Subject Sem ${m.subjectSem}, Class Sem ${m.classSem})`);
    await db.delete(assignments).where(eq(assignments.id, m.id));
  }
  
  console.log("Done");
  process.exit(0);
}

main().catch(console.error);
