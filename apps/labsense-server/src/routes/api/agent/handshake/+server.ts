import type { RequestHandler } from './$types';
import { corsPreflightResponse, jsonResponse } from '$lib/server/cors';
import { generateChallenge } from '$lib/server/crypto/vault';

/** Handle CORS preflight */
export const OPTIONS: RequestHandler = async () => {
	return corsPreflightResponse();
};

/**
 * GET /api/agent/handshake
 *
 * Issues a 30-second cryptographic challenge nonce to prevent replay attacks on login.
 */
export const GET: RequestHandler = async () => {
	const challenge = generateChallenge();
	return jsonResponse({ challenge });
};
