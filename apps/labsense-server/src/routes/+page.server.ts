import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { masterUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession, setSessionCookie } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/app');
	}
	return {};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
			return fail(400, { message: 'Invalid request' });
		}

		const [user] = await db.select().from(masterUsers).where(eq(masterUsers.username, username));

		if (!user) {
			return fail(400, { message: 'Invalid username or password' });
		}

		const validPassword = await verifyPassword(user.password, password);

		if (!validPassword) {
			return fail(400, { message: 'Invalid username or password' });
		}

		const sessionId = await createSession(user.id);
		setSessionCookie(cookies, sessionId);

		throw redirect(302, '/app');
	}
};
