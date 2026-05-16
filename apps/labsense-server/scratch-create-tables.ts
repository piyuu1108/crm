import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        console.log('Creating new tables...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS session_details (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                app_id UUID NOT NULL REFERENCES session_apps(id) ON DELETE CASCADE,
                title TEXT,
                url TEXT,
                domain TEXT,
                total_seconds INTEGER NOT NULL DEFAULT 0,
                active_seconds INTEGER NOT NULL DEFAULT 0,
                idle_seconds INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                UNIQUE(app_id, title, url)
            );
        `);
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS activity_segments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID NOT NULL REFERENCES lab_sessions(id) ON DELETE CASCADE,
                app_id UUID REFERENCES session_apps(id) ON DELETE CASCADE,
                detail_id UUID REFERENCES session_details(id) ON DELETE CASCADE,
                started_at TIMESTAMP WITH TIME ZONE NOT NULL,
                ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            );
        `);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_segments_session ON activity_segments(session_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_segments_app ON activity_segments(app_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_segments_detail ON activity_segments(detail_id);`);
        console.log('Tables created successfully');
    } catch (e) {
        console.error('Error creating tables:', e);
    }
    process.exit(0);
}

run();
