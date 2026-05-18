import type { RequestHandler } from './$types';
import { corsPreflightResponse, jsonResponse, errorResponse } from '$lib/server/cors';
import { validateLoginPayload } from '$lib/server/validation/validation';
import {
	authenticateStudent,
	upsertMachine,
	createLabSession,
	getSystemSettings
} from '$lib/server/services/agent';
import { decryptRsaPayload, decryptAesGcmWithKey, storeAesKey, consumeChallenge } from '$lib/server/crypto/vault';

// Simple in-memory rate limiter for login
interface RateLimitEntry {
	count: number;
	resetAt: number;
}
const rateLimits = new Map<string, RateLimitEntry>();

setInterval(() => {
	const now = Date.now();
	for (const [id, entry] of rateLimits.entries()) {
		if (now > entry.resetAt) {
			rateLimits.delete(id);
		}
	}
}, 60000).unref();

function checkRateLimit(collegeId: string): boolean {
	if (rateLimits.size > 10000) rateLimits.clear(); // Emergency OOM prevention

	const now = Date.now();
	let entry = rateLimits.get(collegeId);
	
	if (!entry || now > entry.resetAt) {
		entry = { count: 1, resetAt: now + 60000 };
		rateLimits.set(collegeId, entry);
		return true;
	}
	
	entry.count += 1;
	return entry.count <= 5;
}

/** Handle CORS preflight */
export const OPTIONS: RequestHandler = async () => {
	return corsPreflightResponse();
};

/**
 * POST /api/agent/login
 *
 * Receives Hybrid encrypted payload (AES key encrypted by RSA, payload encrypted by AES).
 */
export const POST: RequestHandler = async ({ request }) => {
	// Restrict payload size to prevent OOM
	const bodyText = await request.text();
	if (bodyText.length > 8192) {
		return errorResponse('Payload too large', 413);
	}

	let body: any;
	try {
		body = JSON.parse(bodyText);
	} catch (e) {
		return errorResponse('Invalid JSON body', 400);
	}

	if (!body || typeof body.encryptedKey !== 'string' || typeof body.payload !== 'string') {
		return errorResponse('Invalid payload format. Expected { encryptedKey: string, payload: string }', 400);
	}

	let loginAesKey: Buffer;
	try {
		const decryptedKeyText = decryptRsaPayload(body.encryptedKey);
		loginAesKey = Buffer.from(decryptedKeyText, 'base64');
		if (loginAesKey.length !== 32) throw new Error('Invalid AES key length');
	} catch (e) {
		return errorResponse('RSA Decryption failed', 400);
	}

	const decryptedText = decryptAesGcmWithKey(loginAesKey, body.payload);
	if (!decryptedText) {
		return errorResponse('AES Decryption failed', 400);
	}

	let decryptedJson: any;
	try {
		decryptedJson = JSON.parse(decryptedText);
	} catch (e) {
		return errorResponse('Invalid JSON in decrypted payload', 400);
	}

	// Validate challenge nonce
	if (!decryptedJson.nonce || typeof decryptedJson.nonce !== 'string' || !consumeChallenge(decryptedJson.nonce)) {
		return errorResponse('Replay attack detected: invalid or expired challenge nonce', 400);
	}

	const sessionAesKey = decryptedJson.sessionAesKey;

	// Validate payload
	const validation = validateLoginPayload(decryptedJson);
	if (!validation.ok) {
		return errorResponse(validation.error, 400);
	}

	const { collegeId, password, hardwareId, pcName, labName } = validation.data as any;

	if (!sessionAesKey) {
		return errorResponse('Missing sessionAesKey in payload', 400);
	}

	// Rate limiter
	if (!checkRateLimit(collegeId)) {
		return errorResponse('Too Many Requests', 429);
	}

	// Authenticate student
	const authResult = await authenticateStudent(collegeId, password);
	if (!authResult.ok) {
		return errorResponse(authResult.error, authResult.status);
	}

	// Upsert machine (create if missing, update last_seen_at)
	const machineId = await upsertMachine(hardwareId, pcName, labName);

	// Create new lab session
	const sessionId = await createLabSession(collegeId, machineId);

	// Store AES Key mapped to sessionId (which acts as syncToken)
	storeAesKey(sessionId, sessionAesKey);

	// Read runtime-configurable settings
	const settings = await getSystemSettings();

	return jsonResponse({
		sessionId,
		syncIntervalSeconds: settings.syncIntervalSeconds,
		syncJitterSeconds: settings.syncJitterSeconds,
		timeoutSeconds: settings.timeoutSeconds,
		idleThresholdSeconds: settings.idleThresholdSeconds,
		enableDetails: settings.enableDetails,
		enableSegments: settings.enableSegments,
		maxSegmentsPerApp: settings.maxSegmentsPerApp,
		maxSegmentsPerDetail: settings.maxSegmentsPerDetail,
		maxDetailsPerApp: settings.maxDetailsPerApp,
		minimumTrackedSeconds: settings.minimumTrackedSeconds,
		candidateRetentionMinutes: settings.candidateRetentionMinutes
	});
};
