import { db } from './src/lib/server/db/index.js';
import { students } from './src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
	try {
		const [student] = await db.select().from(students).where(eq(students.id, '24BCADS135'));
		console.log('Stored student:', student);
	} catch (err) {
		console.error(err);
	}
	process.exit(0);
}

check();
