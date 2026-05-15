import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
	try {
		await db.execute(sql`ALTER TABLE system_settings ADD COLUMN idle_threshold_seconds integer NOT NULL DEFAULT 300;`);
		console.log('Column added successfully.');
	} catch (err) {
		console.error('Error adding column:', err);
	}
	process.exit(0);
}

run();
