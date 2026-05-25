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

  console.log("Creating approvals tables...");
  
  // 1. Create faculty_request_types
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faculty_request_types" (
      "id" SERIAL PRIMARY KEY,
      "code" VARCHAR(50) NOT NULL UNIQUE,
      "name" VARCHAR(100) NOT NULL,
      "description" TEXT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 2. Create faculty_approval_configs
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faculty_approval_configs" (
      "id" SERIAL PRIMARY KEY,
      "request_type_code" VARCHAR(50) NOT NULL UNIQUE REFERENCES "faculty_request_types"("code") ON DELETE CASCADE,
      "approval_chain" JSONB NOT NULL,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 3. Create faculty_requests
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faculty_requests" (
      "id" SERIAL PRIMARY KEY,
      "faculty_id" INTEGER NOT NULL REFERENCES "faculty"("id") ON DELETE CASCADE,
      "request_type_code" VARCHAR(50) NOT NULL REFERENCES "faculty_request_types"("code") ON DELETE CASCADE,
      "from_date" DATE NOT NULL,
      "to_date" DATE NOT NULL,
      "description" TEXT NOT NULL,
      "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
      "current_step_index" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 4. Create faculty_request_documents
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faculty_request_documents" (
      "id" SERIAL PRIMARY KEY,
      "request_id" INTEGER NOT NULL REFERENCES "faculty_requests"("id") ON DELETE CASCADE,
      "file_name" VARCHAR(255) NOT NULL,
      "file_url" VARCHAR(500) NOT NULL,
      "file_size" INTEGER,
      "uploaded_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 5. Create faculty_request_approvals
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faculty_request_approvals" (
      "id" SERIAL PRIMARY KEY,
      "request_id" INTEGER NOT NULL REFERENCES "faculty_requests"("id") ON DELETE CASCADE,
      "approver_role" VARCHAR(50) NOT NULL,
      "approver_user_id" INTEGER REFERENCES "faculty"("id"),
      "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
      "remarks" TEXT,
      "sequence_order" INTEGER NOT NULL,
      "actioned_at" TIMESTAMP
    );
  `);

  // 6. Create faculty_request_proxies
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faculty_request_proxies" (
      "id" SERIAL PRIMARY KEY,
      "request_id" INTEGER NOT NULL REFERENCES "faculty_requests"("id") ON DELETE CASCADE,
      "date" DATE NOT NULL,
      "slot_id" INTEGER NOT NULL REFERENCES "timetable_slots"("id") ON DELETE CASCADE,
      "original_faculty_id" INTEGER NOT NULL REFERENCES "faculty"("id") ON DELETE CASCADE,
      "proxy_faculty_id" INTEGER NOT NULL REFERENCES "faculty"("id") ON DELETE CASCADE,
      "division_id" INTEGER NOT NULL REFERENCES "divisions"("id") ON DELETE CASCADE,
      "subject_id" INTEGER NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
      "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
      "overridden_by" INTEGER REFERENCES "faculty"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Seeding request types and approval chain configurations...");
  
  // Seed request types
  await db.execute(sql`
    INSERT INTO "faculty_request_types" ("code", "name", "description")
    VALUES 
      ('leave_approval', 'Leave Approval', 'Requests for leave that display faculty lecture slots and require proxies'),
      ('work_from_home', 'Work From Home', 'Requests for work from home that do not require classroom proxies')
    ON CONFLICT ("code") DO UPDATE 
    SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
  `);

  // Seed approval chain configurations
  await db.execute(sql`
    INSERT INTO "faculty_approval_configs" ("request_type_code", "approval_chain")
    VALUES 
      ('leave_approval', '["HOD", "PRINCIPAL"]'::jsonb),
      ('work_from_home', '["HOD"]'::jsonb)
    ON CONFLICT ("request_type_code") DO UPDATE 
    SET "approval_chain" = EXCLUDED."approval_chain";
  `);

  console.log("Approvals tables migrated and seeded successfully!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
