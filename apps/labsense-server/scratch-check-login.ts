import { db } from './src/lib/server/db/index.js';
import { masterUsers } from './src/lib/server/db/schema.js';
import { verifyPassword, hashPassword } from './src/lib/server/auth.js';
import { eq } from 'drizzle-orm';

async function check() {
	try {
		const [user] = await db.select().from(masterUsers).where(eq(masterUsers.username, 'piyu'));
		console.log('Stored user:', user);
        
        if (user) {
            const valid = await verifyPassword(user.password, 'piyu');
            console.log('verifyPassword result:', valid);
            
            const newHash = await hashPassword('piyu');
            console.log('New hash generated:', newHash);
        } else {
            console.log('User not found!');
        }
	} catch (err) {
		console.error(err);
	}
	process.exit(0);
}

check();
