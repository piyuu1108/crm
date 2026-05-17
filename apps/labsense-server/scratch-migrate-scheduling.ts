import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('Migrating LabSense System Settings: Adding Scheduling Mode...');

        // 1. Create the Enum Type if it doesn't exist
        console.log('Ensuring scheduling_mode enum exists...');
        await db.execute(sql`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduling_mode') THEN 
                    CREATE TYPE scheduling_mode AS ENUM ('random_jitter', 'deterministic_slot');
                END IF;
            END $$;
        `);

        // 2. Add the column to system_settings
        console.log('Adding scheduling_mode column to system_settings...');
        await db.execute(sql`
            ALTER TABLE system_settings 
            ADD COLUMN IF NOT EXISTS scheduling_mode scheduling_mode 
            NOT NULL DEFAULT 'deterministic_slot';
        `);

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
