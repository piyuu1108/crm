import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0];
      let value = parts.slice(1).join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key && value && !process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Running timetable migrations...");

  try {
    await sql`ALTER TABLE divisions ADD COLUMN IF NOT EXISTS publish_status VARCHAR(20) NOT NULL DEFAULT 'draft'`;
    console.log("✅ divisions.publish_status added");
  } catch (e: any) {
    console.log("divisions.publish_status:", e.message);
  }

  try {
    await sql`ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#6366f1'`;
    console.log("✅ timetable_entries.color added");
  } catch (e: any) {
    console.log("timetable_entries.color:", e.message);
  }

  console.log("Done!");
}

migrate();
