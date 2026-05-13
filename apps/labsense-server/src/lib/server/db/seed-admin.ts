import 'dotenv/config';
import { db } from './index.js';
import { masterUsers } from './schema.js';
import { hashPassword } from '../auth.js';

async function seed() {
	try {
		console.log('Seeding admin user...');
		const hashedPassword = await hashPassword('admin');
		await db
			.insert(masterUsers)
			.values({
				username: 'admin',
				password: hashedPassword
			})
			.onConflictDoNothing();
		console.log('Admin user seeded successfully (or already exists)');
	} catch (error) {
		console.error('Error seeding admin user:', error);
	} finally {
		process.exit(0);
	}
}

seed();
