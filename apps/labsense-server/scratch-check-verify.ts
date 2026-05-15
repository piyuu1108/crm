import { verifyPassword, hashPassword } from './src/lib/server/auth.js';

async function check() {
	try {
        const newHash = await hashPassword('piyu');
        console.log('New hash generated:', newHash);
        
        const valid = await verifyPassword(newHash, 'piyu');
        console.log('verifyPassword result:', valid);
	} catch (err) {
		console.error(err);
	}
	process.exit(0);
}

check();
