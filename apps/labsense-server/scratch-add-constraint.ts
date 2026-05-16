import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        console.log('Adding unique constraint to activity_segments...');
        await db.execute(sql`ALTER TABLE activity_segments ADD CONSTRAINT uq_activity_segment UNIQUE(session_id, started_at, ended_at, app_id, detail_id);`);
        console.log('Constraint added successfully');
    } catch (e) {
        console.error('Error adding constraint:', e);
    }
    process.exit(0);
}

run();
