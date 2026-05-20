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
	const reqStart = performance.now();
	// Parse body
	const body = await parseJsonBody(request);
	if (body === null || typeof body.syncToken !== 'string' || typeof body.payload !== 'string') {
		return errorResponse('Invalid JSON body. Expected { syncToken: string, payload: string }', 400);
	}

	const { syncToken, payload } = body;

	console.log('Encrypted payload size:',
	Buffer.byteLength(payload, 'utf8'),
	'bytes'
);

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

	// Fix 1: Complexity Cap (Prevent OOM/Event Loop Blocking)
	const data = validation.data;
	const totalElements =
		data.applications.length +
		data.applications.reduce((acc, app) => {
			const detailCount = app.details?.length || 0;
			const appSegCount = app.segments?.length || 0;
			const detailSegCount =
				app.details?.reduce((dAcc, d) => dAcc + (d.segments?.length || 0), 0) || 0;
			return acc + detailCount + appSegCount + detailSegCount;
		}, 0);

	if (totalElements > 2500) {
		return errorResponse('Payload complexity exceeds safety limits', 413);
	}

	const dbBody = JSON.stringify(data);

console.log({
	apps: data.applications.length,
	details: data.applications.reduce(
		(a, x) => a + (x.details?.length || 0),
		0
	),
	segments: totalElements,
	bytes: Buffer.byteLength(JSON.stringify(data)),
});

console.log('DB body size:',
	Buffer.byteLength(dbBody, 'utf8'),
	'bytes'
);
	// Execute sync within transaction
	const syncStart = performance.now();
	const result = await syncSession(syncToken, data);
	const syncTime = performance.now() - syncStart;
const totalTime = performance.now() - reqStart;

console.log({
	syncMs: Number(syncTime.toFixed(2)),
	totalMs: Number(totalTime.toFixed(2))
});
	if (!result.ok) {
		return errorResponse(result.error, result.status);
	}

	return jsonResponse({ success: true });
};
