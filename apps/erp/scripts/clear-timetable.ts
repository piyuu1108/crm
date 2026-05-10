import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

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
      if (key && value && !process.env[key.trim()]) process.env[key.trim()] = value;
    }
  });
}

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  await sql`DELETE FROM timetable_entries`;
  console.log("Cleared all timetable entries");
}

run().catch(console.error);
