import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('Adding new columns to system_settings...');
        
        // Add columns one by one with defaults to avoid issues
        await db.execute(sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS enable_details BOOLEAN NOT NULL DEFAULT true`);
        await db.execute(sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS enable_segments BOOLEAN NOT NULL DEFAULT true`);
        await db.execute(sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS max_segments_per_app INTEGER NOT NULL DEFAULT 50`);
        await db.execute(sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS max_segments_per_detail INTEGER NOT NULL DEFAULT 20`);
        await db.execute(sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS minimum_tracked_seconds INTEGER NOT NULL DEFAULT 15`);
        await db.execute(sql`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS candidate_retention_minutes INTEGER NOT NULL DEFAULT 10`);
        
        // Update idle_threshold_seconds default (this only affects new rows, but we only have one)
        await db.execute(sql`ALTER TABLE system_settings ALTER COLUMN idle_threshold_seconds SET DEFAULT 120`);
        
        // Update existing row if it exists
        await db.execute(sql`UPDATE system_settings SET idle_threshold_seconds = 120 WHERE id = 1 AND idle_threshold_seconds = 300`);

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
