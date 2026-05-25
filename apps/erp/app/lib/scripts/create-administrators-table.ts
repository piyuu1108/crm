import fs from "fs";
import path from "path";

// Load .env manually BEFORE importing any db dependencies
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function run() {
  console.log("Loading db module dynamically...");
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");

  console.log("Creating administrators table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "administrators" (
      "id" SERIAL PRIMARY KEY,
      "admin_code" VARCHAR(20) NOT NULL UNIQUE,
      "name" VARCHAR(100) NOT NULL,
      "email" VARCHAR(150) NOT NULL UNIQUE,
      "mobile" VARCHAR(15) NOT NULL,
      "password_hash" VARCHAR(255) NOT NULL,
      "must_change_pwd" BOOLEAN NOT NULL DEFAULT true,
      "designation" VARCHAR(100) NOT NULL,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  
  console.log("Migration completed successfully!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
