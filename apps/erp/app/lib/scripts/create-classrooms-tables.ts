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

  console.log("Creating classrooms table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "classrooms" (
      "id" SERIAL PRIMARY KEY,
      "room_code" VARCHAR(50) NOT NULL UNIQUE,
      "building_name" VARCHAR(150),
      "floor" VARCHAR(50) NOT NULL,
      "lecture_capacity" INTEGER NOT NULL,
      "description" TEXT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "course_id" INTEGER NOT NULL REFERENCES "courses"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("classrooms table created.");

  console.log("Creating classrooms indexes...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "classrooms_course_idx" ON "classrooms" ("course_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "classrooms_active_idx" ON "classrooms" ("is_active");
  `);

  console.log("Creating classroom_benches table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "classroom_benches" (
      "id" SERIAL PRIMARY KEY,
      "classroom_id" INTEGER NOT NULL REFERENCES "classrooms"("id") ON DELETE CASCADE,
      "label" VARCHAR(10) NOT NULL,
      "grid_x" INTEGER NOT NULL,
      "grid_y" INTEGER NOT NULL,
      "max_students" INTEGER NOT NULL DEFAULT 2,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT
    );
  `);
  console.log("classroom_benches table created.");

  console.log("Creating classroom_benches indexes...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cb_classroom_idx" ON "classroom_benches" ("classroom_id");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "cb_classroom_grid_idx" ON "classroom_benches" ("classroom_id", "grid_x", "grid_y");
  `);

  console.log("Migration completed successfully!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
