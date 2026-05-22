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

const migration0011 = fs.readFileSync(
  path.resolve(process.cwd(), "drizzle/0011_student_address_jsonb.sql"),
  "utf8"
);

const migration0012 = fs.readFileSync(
  path.resolve(process.cwd(), "drizzle/0012_consolidate_faculty_tables.sql"),
  "utf8"
);

async function run() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log("▶ Running 0011: student address JSONB...");
    await sql.unsafe(migration0011);
    console.log("✅ 0011 done");

    console.log("▶ Running 0012: faculty table consolidation...");
    await sql.unsafe(migration0012);
    console.log("✅ 0012 done");

    console.log("\n🎉 All migrations applied.");
  } finally {
    await sql.end();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message ?? err);
  process.exit(1);
});
