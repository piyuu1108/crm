import type { RequestHandler } from './$types';
import { corsPreflightResponse, jsonResponse, errorResponse } from '$lib/server/cors';
import { isValidUUID } from '$lib/server/validation/validation';
import { logoutSession } from '$lib/server/services/session';

/** Handle CORS preflight */
export const OPTIONS: RequestHandler = async () => {
	return corsPreflightResponse();
};

/**
 * POST /api/sessions/:id/logout
 *
 * Ends a session normally. Marks status = completed, end_reason = logout.
 * Rejects sessions that are already completed.
 */
export const POST: RequestHandler = async ({ params }) => {
	// Validate session ID format
	if (!isValidUUID(params.id)) {
		return errorResponse('Invalid session ID format', 400);
	}

	const result = await logoutSession(params.id);
	if (!result.ok) {
		return errorResponse(result.error, result.status);
	}

	return jsonResponse({ success: true });
};
