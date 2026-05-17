import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function optimize() {
    try {
        console.log('Optimizing constraints for LabSense telemetry...');

        await db.transaction(async (tx) => {
            
            console.log('1. Aggressively deduplicating session_details...');
            // Groups identical rows, orders by newest, and deletes all older duplicates
            await tx.execute(sql`
                DELETE FROM session_details
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY app_id, title, url 
                            ORDER BY updated_at DESC
                        ) as row_num
                        FROM session_details
                    ) t
                    WHERE t.row_num > 1
                );
            `);

            console.log('2. Aggressively deduplicating activity_segments...');
            // Groups identical segments, orders by newest, and deletes all older duplicates
            await tx.execute(sql`
                DELETE FROM activity_segments
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY session_id, app_id, detail_id, started_at 
                            ORDER BY created_at DESC
                        ) as row_num
                        FROM activity_segments
                    ) t
                    WHERE t.row_num > 1
                );
            `);

            console.log('3. Applying NULLS NOT DISTINCT to session_details...');
            await tx.execute(sql`ALTER TABLE session_details DROP CONSTRAINT IF EXISTS uq_session_detail`);
            await tx.execute(sql`DROP INDEX IF EXISTS uq_session_detail`); // Catches Drizzle indexes
            await tx.execute(sql`ALTER TABLE session_details ADD CONSTRAINT uq_session_detail UNIQUE NULLS NOT DISTINCT (app_id, title, url)`);

            console.log('4. Applying NULLS NOT DISTINCT to activity_segments...');
            await tx.execute(sql`ALTER TABLE activity_segments DROP CONSTRAINT IF EXISTS uq_activity_segment`);
            await tx.execute(sql`DROP INDEX IF EXISTS uq_activity_segment`); // Catches Drizzle indexes
            await tx.execute(sql`ALTER TABLE activity_segments ADD CONSTRAINT uq_activity_segment UNIQUE NULLS NOT DISTINCT (session_id, app_id, detail_id, started_at)`);

        });

        console.log('Optimization migration completed successfully. Database is now fully protected.');
    } catch (error) {
        console.error('Migration failed (All changes rolled back):', error);
    } finally {
        process.exit(0);
    }
}

optimize();