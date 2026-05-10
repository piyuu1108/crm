import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { db } from "../app/lib/db";
import { faculty, roles, facultyRoles } from "../app/lib/schema";
import { eq, inArray } from "drizzle-orm";

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

async function seedRoles() {
  console.log("🔐 Starting Role Assignment for Imported Faculties...");
  
  const exportsDir = path.join(__dirname, "../../ims/exports");
  const facultyPath = path.join(exportsDir, "faculty.csv");

  if (!fs.existsSync(facultyPath)) {
    console.error("❌ Faculty export file not found! Make sure to run the IMS export script first.");
    process.exit(1);
  }

  const facultyData = parseCSV(fs.readFileSync(facultyPath, "utf-8"));
  const importedCodes = facultyData.map((f: any) => f.code).filter(Boolean);

  if (importedCodes.length === 0) {
    console.log("⚠️ No faculty codes found in the CSV.");
    process.exit(0);
  }

  // 1. Ensure 'faculty' role exists
  let [facultyRole] = await db.select().from(roles).where(eq(roles.name, "faculty"));
  if (!facultyRole) {
    console.log("📝 'faculty' role not found, creating it...");
    const [newRole] = await db.insert(roles).values({ name: "faculty" }).returning();
    facultyRole = newRole;
  }

  // 2. Find all matching faculty records in DB
  const matchingFaculties = await db
    .select({ id: faculty.id, code: faculty.facultyCode })
    .from(faculty)
    .where(inArray(faculty.facultyCode, importedCodes));

  if (matchingFaculties.length === 0) {
    console.log("⚠️ No matching faculty found in the database. Run seed-ims-data.ts first.");
    process.exit(0);
  }

  // 3. Assign the role
  let rolesAdded = 0;
  let rolesSkipped = 0;

  for (const fac of matchingFaculties) {
    try {
      await db.insert(facultyRoles)
        .values({
          facultyId: fac.id,
          roleId: facultyRole.id,
        })
        .onConflictDoNothing({
          target: [facultyRoles.facultyId, facultyRoles.roleId],
        });
      rolesAdded++;
    } catch (err) {
      rolesSkipped++;
    }
  }

  console.log(`🎉 Role Assignment Completed!`);
  console.log(`   → ${rolesAdded} roles assigned (or already assigned).`);
  console.log(`   → ${matchingFaculties.length} total faculties processed.`);
}

seedRoles().catch((err) => {
  console.error("❌ Seeding roles failed:", err);
  process.exit(1);
});
