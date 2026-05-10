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

async function updateFacultyCode() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("❌ Error: Missing arguments.");
    console.log("Usage: npx tsx scripts/update-faculty-code.ts <old_faculty_code> <new_faculty_code>");
    console.log("Example: npx tsx scripts/update-faculty-code.ts FAC001 FAC999");
    process.exit(1);
  }

  const oldCode = args[0];
  const newCode = args[1];

  console.log(`🔄 Attempting to update faculty code from '${oldCode}' to '${newCode}'...`);

  try {
    // Check if the old faculty exists
    const checkOld = await sql`SELECT id, name FROM faculty WHERE faculty_code = ${oldCode}`;
    if (checkOld.length === 0) {
      console.error(`❌ Error: No faculty found with code '${oldCode}'.`);
      process.exit(1);
    }
    const facultyName = checkOld[0].name;

    // Check if the new code is already in use
    const checkNew = await sql`SELECT id FROM faculty WHERE faculty_code = ${newCode}`;
    if (checkNew.length > 0) {
      console.error(`❌ Error: The new faculty code '${newCode}' is already in use by another faculty.`);
      process.exit(1);
    }

    // Perform the update
    const result = await sql`
      UPDATE faculty 
      SET faculty_code = ${newCode} 
      WHERE faculty_code = ${oldCode} 
      RETURNING id, name, faculty_code
    `;

    if (result.length > 0) {
      console.log(`✅ Success! Updated faculty '${facultyName}' (ID: ${result[0].id}).`);
      console.log(`   New Code: ${result[0].faculty_code}`);
    } else {
      console.error("❌ Update failed for an unknown reason.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Database error during update:", error);
    process.exit(1);
  }
}

updateFacultyCode();
