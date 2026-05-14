import { validateSession, SESSION_COOKIE_NAME, deleteSessionCookie } from '$lib/server/auth';
import { startTimeoutSweeper } from '$lib/server/services/timeout';
import { redirect, type Handle } from '@sveltejs/kit';

// Start the timeout sweeper on server boot
startTimeoutSweeper();

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Agent API routes do not use cookie auth — skip session validation
	if (path.startsWith('/api/')) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// Admin cookie-based session validation
	const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const result = await validateSession(sessionId);
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
		} else {
			deleteSessionCookie(event.cookies);
			event.locals.user = null;
			event.locals.session = null;
		}
	}

	// Protect /app/*
	if (path.startsWith('/app')) {
		if (!event.locals.user) {
			throw redirect(302, '/');
		}
	}

	// Redirect authenticated users from / to /app
	if (path === '/') {
		if (event.locals.user) {
			throw redirect(302, '/app');
		}
	}

	return resolve(event);
};
