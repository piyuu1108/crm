import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { corsPreflightResponse, jsonResponse, errorResponse } from '$lib/server/cors';
import { parseJsonBody, validateLoginPayload } from '$lib/server/validation/validation';
import {
	authenticateStudent,
	upsertMachine,
	createLabSession,
	getSystemSettings
} from '$lib/server/services/agent';

/** Handle CORS preflight */
export const OPTIONS: RequestHandler = async () => {
	return corsPreflightResponse();
};

/**
 * POST /api/agent/login
 *
 * Authenticates a student, upserts the machine, creates a new session,
 * and returns the session ID + sync configuration from system_settings.
 */
export const POST: RequestHandler = async ({ request }) => {
	// Parse body
	const body = await parseJsonBody(request);
	if (body === null) {
		return errorResponse('Invalid JSON body', 400);
	}

	// Validate payload
	const validation = validateLoginPayload(body);
	if (!validation.ok) {
		return errorResponse(validation.error, 400);
	}

	const { collegeId, password, hardwareId, pcName, labName } = validation.data;

	// Authenticate student
	const authResult = await authenticateStudent(collegeId, password);
	if (!authResult.ok) {
		return errorResponse(authResult.error, authResult.status);
	}

	// Upsert machine (create if missing, update last_seen_at)
	const machineId = await upsertMachine(hardwareId, pcName, labName);

	// Create new lab session
	const sessionId = await createLabSession(collegeId, machineId);

	// Read runtime-configurable settings
	const settings = await getSystemSettings();

	return jsonResponse({
		sessionId,
		syncIntervalSeconds: settings.syncIntervalSeconds,
		syncJitterSeconds: settings.syncJitterSeconds,
		timeoutSeconds: settings.timeoutSeconds
	});
};
