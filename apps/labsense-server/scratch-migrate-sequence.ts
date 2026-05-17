import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('Migrating LabSessions: Adding Sequence Number tracking...');

        await db.execute(sql`
            ALTER TABLE lab_sessions 
            ADD COLUMN IF NOT EXISTS last_sequence_number bigint 
            NOT NULL DEFAULT 0;
        `);

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
