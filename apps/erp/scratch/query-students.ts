import postgres from "postgres";
import fs from "fs";
import path from "path";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key && value && !process.env[key]) process.env[key] = value;
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const sql = postgres(DATABASE_URL, { max: 1 });

async function run() {
  const students = await sql`SELECT id, email, enrollment_id, full_name, profile_step FROM students LIMIT 5`;
  console.log("Students:", students);
  await sql.end();
}

run().catch((err) => {
  console.error("Query failed:", err);
});
