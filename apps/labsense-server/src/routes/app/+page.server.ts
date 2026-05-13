import { redirect } from '@sveltejs/kit';
import { invalidateSession, deleteSessionCookie } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	logout: async ({ locals, cookies }) => {
		if (locals.session) {
			await invalidateSession(locals.session.id);
		}
		deleteSessionCookie(cookies);
		throw redirect(302, '/');
	}
};
