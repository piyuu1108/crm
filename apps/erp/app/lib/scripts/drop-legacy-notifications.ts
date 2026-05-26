import fs from "fs";
import path from "path";

// Pure TypeScript environment variable loader.
function loadEnv(file: string) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv(".env");
loadEnv(".env.local");

async function run() {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");

  console.log("Dropping legacy 'notifications' PostgreSQL table...");
  
  // Drop table if it exists
  await db.execute(sql`
    DROP TABLE IF EXISTS "notifications" CASCADE;
  `);

  console.log("Legacy 'notifications' PostgreSQL table successfully dropped!");
}

run().catch((err) => {
  console.error("Failed to drop legacy table:", err);
  process.exit(1);
});
