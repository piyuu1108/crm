import { db } from "../db";
import { sql } from "drizzle-orm";
import { convexClient } from "../convex";
import { api } from "../../../convex/_generated/api";

async function run() {
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
      await convexClient.mutation(api.notifications.create, {
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
