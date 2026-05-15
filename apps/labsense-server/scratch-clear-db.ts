import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function clearDb() {
	try {
		console.log('Clearing database...');
		
		// Use raw SQL to easily truncate and cascade, clearing all related data
		await db.execute(sql`TRUNCATE TABLE master_users CASCADE;`);
		await db.execute(sql`TRUNCATE TABLE students CASCADE;`);
		await db.execute(sql`TRUNCATE TABLE machines CASCADE;`);
		// lab_sessions, session_apps, and sessions (adminSessions) will be cleared by CASCADE

		console.log('Database cleared successfully.');
	} catch (err) {
		console.error('Error clearing database:', err);
	}
	process.exit(0);
}

clearDb();
