import type { RequestHandler } from './$types';
import { corsPreflightResponse, jsonResponse, errorResponse } from '$lib/server/cors';
import { parseJsonBody, validateLoginPayload } from '$lib/server/validation/validation';
import {
	authenticateStudent,
	upsertMachine,
	createLabSession,
	getSystemSettings
} from '$lib/server/services/agent';
import { decryptRsaPayload, storeAesKey } from '$lib/server/crypto/vault';

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
 * Receives RSA encrypted payload, authenticates a student, upserts the machine, creates a new session,
 * and returns the session ID + sync configuration from system_settings.
 */
export const POST: RequestHandler = async ({ request }) => {
	// Parse body looking for encrypted payload
	const body = await parseJsonBody(request) as any;
	if (body === null || typeof body.payload !== 'string') {
		return errorResponse('Invalid payload format. Expected { payload: string }', 400);
	}

	let decryptedJson: any;
	try {
		const decryptedText = decryptRsaPayload(body.payload);
		decryptedJson = JSON.parse(decryptedText);
	} catch (e) {
		return errorResponse('Decryption failed', 400);
	}

	const combinedPayload = {
		...body,
		...decryptedJson
	};

	const sessionAesKey = combinedPayload.sessionAesKey;

	// Validate payload
	const validation = validateLoginPayload(combinedPayload);
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
