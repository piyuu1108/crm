import { db } from "../db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating notifications table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" SERIAL PRIMARY KEY,
      "title" VARCHAR(255) NOT NULL,
      "message" TEXT NOT NULL,
      "notification_type" VARCHAR(50) NOT NULL,
      "related_entity_type" VARCHAR(50),
      "related_entity_id" INTEGER,
      "created_by" INTEGER,
      "receiver_user_id" INTEGER NOT NULL,
      "receiver_role" VARCHAR(50) NOT NULL,
      "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
      "is_read" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "metadata" JSONB
    );
  `);
  
  console.log("Creating indexes...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_receiver_idx" ON "notifications" ("receiver_user_id", "receiver_role");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" ("is_read");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");
  `);
  
  console.log("Migration completed successfully!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
