import "dotenv/config";
import { db } from "../db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Altering circulars table...");
  
  // Make faculty_id nullable
  console.log("Making faculty_id nullable...");
  await db.execute(sql`
    ALTER TABLE "circulars" ALTER COLUMN "faculty_id" DROP NOT NULL;
  `);

  // Add admin_id column
  console.log("Adding admin_id column...");
  await db.execute(sql`
    ALTER TABLE "circulars" ADD COLUMN IF NOT EXISTS "admin_id" INTEGER REFERENCES "administrators"("id");
  `);

  console.log("Altering completed successfully!");
}

run().catch((err) => {
  console.error("Alter failed:", err);
  process.exit(1);
});
