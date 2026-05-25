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

  console.log("Adding sender_proxy_faculty_id column if not exists...");
  await db.execute(sql`
    ALTER TABLE "faculty_request_proxies" 
    ADD COLUMN IF NOT EXISTS "sender_proxy_faculty_id" INTEGER REFERENCES "faculty"("id");
  `);

  console.log("Backfilling existing rows (setting sender_proxy_faculty_id to proxy_faculty_id if null)...");
  await db.execute(sql`
    UPDATE "faculty_request_proxies" 
    SET "sender_proxy_faculty_id" = "proxy_faculty_id" 
    WHERE "sender_proxy_faculty_id" IS NULL;
  `);

  console.log("Schema successfully updated and existing rows backfilled!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
