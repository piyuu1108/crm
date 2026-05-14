import type { RequestHandler } from './$types';
import { corsPreflightResponse, jsonResponse, errorResponse } from '$lib/server/cors';
import { parseJsonBody, validateSyncPayload, isValidUUID } from '$lib/server/validation/validation';
import { syncSession } from '$lib/server/services/session';

/** Handle CORS preflight */
export const OPTIONS: RequestHandler = async () => {
	return corsPreflightResponse();
};

/**
 * PATCH /api/sessions/:id
 *
 * Periodic sync from the agent. Updates session aggregates,
 * upserts application usage, and updates machine last_seen_at.
 * Runs entirely within a transaction.
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	// Validate session ID format
	if (!isValidUUID(params.id)) {
		return errorResponse('Invalid session ID format', 400);
	}

	// Parse body
	const body = await parseJsonBody(request);
	if (body === null) {
		return errorResponse('Invalid JSON body', 400);
	}

	// Validate payload
	const validation = validateSyncPayload(body);
	if (!validation.ok) {
		return errorResponse(validation.error, 400);
	}

	// Execute sync within transaction
	const result = await syncSession(params.id, validation.data);
	if (!result.ok) {
		return errorResponse(result.error, result.status);
	}

	return jsonResponse({ success: true });
};
