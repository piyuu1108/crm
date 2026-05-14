import 'dotenv/config';
import { db } from './index.js';
import { masterUsers, systemSettings } from './schema.js';
import { hashPassword } from '../auth.js';

async function seed() {
	try {
		// Seed admin user
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

		// Seed system settings
		console.log('Seeding system settings...');
		await db
			.insert(systemSettings)
			.values({
				id: 1,
				syncIntervalSeconds: 30,
				syncJitterSeconds: 30,
				timeoutSeconds: 120
			})
			.onConflictDoNothing();
		console.log('System settings seeded successfully (or already exists)');
	} catch (error) {
		console.error('Error during seeding:', error);
	} finally {
		process.exit(0);
	}
}

seed();
