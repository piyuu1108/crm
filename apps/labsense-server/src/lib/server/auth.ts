import argon2 from 'argon2';
import { db } from '$lib/server/db';
import { sessions, masterUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE_NAME = 'auth_session';

export async function hashPassword(password: string): Promise<string> {
	return await argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	try {
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}

export function generateSessionId(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function createSession(userId: string): Promise<string> {
	const sessionId = generateSessionId();
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

	await db.insert(sessions).values({
		id: sessionId,
		userId,
		expiresAt
	});

	return sessionId;
}

export async function validateSession(sessionId: string) {
	const [result] = await db
		.select({
			session: sessions,
			user: masterUsers
		})
		.from(sessions)
		.innerJoin(masterUsers, eq(sessions.userId, masterUsers.id))
		.where(eq(sessions.id, sessionId));

	if (!result) return null;

	const { session, user } = result;

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return null;
	}

	// Optional: Slide expiration if needed, but requirements say "exactly 1 hour"
	// and "proper logout handling". I'll stick to fixed 1 hour for now.

	return { session, user };
}

export async function invalidateSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function setSessionCookie(cookies: Cookies, sessionId: string) {
	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		expires: new Date(Date.now() + 1000 * 60 * 60),
		path: '/',
		secure: true // Requirements say "secure HttpOnly cookie"
	});
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}
