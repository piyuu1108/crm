import { hash, verify } from '@node-rs/argon2';
import { db } from '$lib/server/db';
import { adminSessions, masterUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE_NAME = 'auth_session';

// The "Pepper" - Store this in an environment variable, NOT the database.
const PEPPER = "o-shoneya-menu-nayi-jina-tere-bina";

export async function hashPassword(password: string): Promise<string> {
    return await hash(password + PEPPER, {
        // 1. Switch to Argon2id (Hybrid - better side-channel protection)
        algorithm: 2, 
        
        // 2. Increase to 2 iterations (Small hit to speed, big hit to attackers)
        timeCost: 2, 
        
        // 3. 32MB Memory (Significant enough to bottleneck 2026-era GPUs)
        memoryCost: 32768, 
        
        parallelism: 1,
        outputLen: 32 
    });
}

export async function verifyPassword(hashStr: string, password: string): Promise<boolean> {
	try {
		return await verify(hashStr, password + PEPPER);
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

	await db.insert(adminSessions).values({
		id: sessionId,
		userId,
		expiresAt
	});

	return sessionId;
}

export async function validateSession(sessionId: string) {
	const [result] = await db
		.select({
			session: adminSessions,
			user: masterUsers
		})
		.from(adminSessions)
		.innerJoin(masterUsers, eq(adminSessions.userId, masterUsers.id))
		.where(eq(adminSessions.id, sessionId));

	if (!result) return null;

	const { session, user } = result;

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
		return null;
	}

	// Optional: Slide expiration if needed, but requirements say "exactly 1 hour"
	// and "proper logout handling". I'll stick to fixed 1 hour for now.

	return { session, user };
}

export async function invalidateSession(sessionId: string) {
	await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
}

export function setSessionCookie(cookies: Cookies, sessionId: string) {
	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true,
		sameSite: 'lax',
		expires: new Date(Date.now() + 1000 * 60 * 60),
		path: '/',
		secure: false
	});
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}
