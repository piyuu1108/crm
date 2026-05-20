import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
	try {
		await db.execute(sql`ALTER TABLE session_apps SET (fillfactor = 80);`);
		await db.execute(sql`ALTER TABLE session_details SET (fillfactor = 80);`);
		console.log('Fillfactor set to 80 for session_apps and session_details.');
	} catch (err) {
		console.error('Error setting fillfactor:', err);
	}
	process.exit(0);
}

run();
