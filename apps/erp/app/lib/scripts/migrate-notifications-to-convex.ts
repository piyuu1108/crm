import fs from "fs";
import path from "path";

// Pure TypeScript dependency-free environment variable loader.
// Prevents needing 'dotenv' npm package inside Next.js/Turbopack scope.
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

import { getConvexClient } from "../convex";
import { api } from "../../../convex/_generated/api";

async function run() {
  // Dynamically import db and sql to prevent ES6 import hoisting from executing db.ts
  // before loadEnv has populated process.env.DATABASE_URL.
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");

  console.log("Checking if legacy 'notifications' table exists...");
  
  // Verify table exists before reading
  const tableCheck = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications'
    );
  `);
  
  const exists = (tableCheck as any)[0]?.exists;
  if (!exists) {
    console.log("Legacy 'notifications' table does not exist or has already been dropped. Skipping migration.");
    return;
  }

  console.log("Fetching legacy notifications from PostgreSQL...");
  const legacyRows = await db.execute(sql`
    SELECT id, title, message, notification_type, related_entity_type, related_entity_id, created_by, receiver_user_id, receiver_role, priority, is_read, created_at, metadata 
    FROM "notifications"
    ORDER BY created_at ASC;
  `);

  const notifications = (legacyRows as any) || [];
  console.log(`Found ${notifications.length} legacy notifications.`);

  let migratedCount = 0;
  for (const n of notifications) {
    try {
      await getConvexClient().mutation(api.notifications.create, {
        title: n.title,
        message: n.message,
        notificationType: n.notification_type,
        receiverUserId: Number(n.receiver_user_id),
        receiverRole: n.receiver_role,
        priority: (n.priority || "medium") as "low" | "medium" | "high",
        relatedEntityType: n.related_entity_type ?? undefined,
        relatedEntityId: n.related_entity_id ? Number(n.related_entity_id) : undefined,
        createdBy: n.created_by ? Number(n.created_by) : undefined,
        metadata: n.metadata ?? undefined,
      });
      migratedCount++;
    } catch (err) {
      console.error(`Failed to migrate notification ID ${n.id}:`, err);
    }
  }

  console.log(`Migration to Convex complete. Migrated ${migratedCount} of ${notifications.length} notifications successfully.`);
  
  console.log("Optionally drop the legacy table by running: DROP TABLE notifications;");
}

run().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
