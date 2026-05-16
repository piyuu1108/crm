import type { RequestHandler } from './$types';
import { corsPreflightResponse, jsonResponse, errorResponse } from '$lib/server/cors';
import { parseJsonBody, validateSyncPayload, isValidUUID } from '$lib/server/validation/validation';
import { syncSession } from '$lib/server/services/session';
import { decryptAesGcmPayload } from '$lib/server/crypto/vault';

/** Handle CORS preflight */
export const OPTIONS: RequestHandler = async () => {
	return corsPreflightResponse();
};

/**
 * PATCH /api/agent/sync
 *
 * Periodic sync from the agent via AES-GCM encryption.
 * Looks up the session AES key by syncToken.
 * Updates session aggregates, upserts application usage, and updates machine last_seen_at.
 */
export const PATCH: RequestHandler = async ({ request }) => {
	// Parse body
	const body = await parseJsonBody(request);
	if (body === null || typeof body.syncToken !== 'string' || typeof body.payload !== 'string') {
		return errorResponse('Invalid JSON body. Expected { syncToken: string, payload: string }', 400);
	}

	const { syncToken, payload } = body;

	// Validate session ID format
	if (!isValidUUID(syncToken)) {
		return errorResponse('Invalid sync token format', 400);
	}

	// Decrypt payload
	const decryptedText = decryptAesGcmPayload(syncToken, payload);
	if (!decryptedText) {
		return errorResponse('Unauthorized. Invalid token or decryption failed.', 401);
	}

	let decryptedJson: any;
	try {
		decryptedJson = JSON.parse(decryptedText);
	} catch (e) {
		return errorResponse('Invalid JSON in decrypted payload', 400);
	}

	// Validate payload
	const validation = validateSyncPayload(decryptedJson);
	if (!validation.ok) {
		return errorResponse(validation.error, 400);
	}

	// Execute sync within transaction
	const result = await syncSession(syncToken, validation.data);
	if (!result.ok) {
		return errorResponse(result.error, result.status);
	}

	return jsonResponse({ success: true });
};
