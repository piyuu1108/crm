import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        console.log('Adding ON DELETE CASCADE to session_apps.session_id FK...');

        // Drop the existing FK constraint and re-add with CASCADE
        await db.execute(sql`
            ALTER TABLE session_apps
            DROP CONSTRAINT IF EXISTS session_apps_session_id_lab_sessions_id_fk
        `);
        await db.execute(sql`
            ALTER TABLE session_apps
            ADD CONSTRAINT session_apps_session_id_lab_sessions_id_fk
            FOREIGN KEY (session_id) REFERENCES lab_sessions(id) ON DELETE CASCADE
        `);

        console.log('✅ Done — cascade chain: lab_sessions → session_apps → session_details → activity_segments');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

run();
