import { db } from './src/lib/server/db/index.js';
import { systemSettings } from './src/lib/server/db/schema.js';

async function verify() {
    try {
        const [settings] = await db.select().from(systemSettings).limit(1);
        console.log('Current System Settings in DB:', JSON.stringify(settings, null, 2));
    } catch (err) {
        console.error('Verification failed:', err);
    }
    process.exit(0);
}

verify();
