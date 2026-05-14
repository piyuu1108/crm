import { validateSession, SESSION_COOKIE_NAME, deleteSessionCookie } from '$lib/server/auth';
import { startTimeoutSweeper } from '$lib/server/services/timeout';
import { redirect, type Handle } from '@sveltejs/kit';

// Start the timeout sweeper on server boot
startTimeoutSweeper();

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const method = event.request.method;

	console.log(`[hooks] ${method} ${path}`);

	// Agent API routes do not use cookie auth — skip session validation
	if (path.startsWith('/api/')) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// Admin cookie-based session validation
	const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

	if (!sessionId) {
		console.log(`[hooks] No session cookie found for ${path}`);
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const result = await validateSession(sessionId);
		if (result) {
			console.log(`[hooks] Valid session for user: ${result.user.username}`);
			event.locals.user = result.user;
			event.locals.session = result.session;
		} else {
			console.log(`[hooks] Invalid session cookie: ${sessionId}`);
			deleteSessionCookie(event.cookies);
			event.locals.user = null;
			event.locals.session = null;
		}
	}

	// Protect /app/*
	if (path.startsWith('/app')) {
		if (!event.locals.user) {
			console.log(`[hooks] Unauthorized access to ${path}, redirecting to /`);
			throw redirect(302, '/');
		}
	}

	// Redirect authenticated users from / to /app
	if (path === '/') {
		if (event.locals.user) {
			console.log(`[hooks] Authenticated user on /, redirecting to /app`);
			throw redirect(302, '/app');
		}
	}

	return resolve(event);
};
