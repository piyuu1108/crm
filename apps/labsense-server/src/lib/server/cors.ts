/**
 * Permissive CORS headers for LAN agent communication.
 * All origins are allowed since agents run on local network machines.
 */
export function corsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400'
	};
}

/** Pre-built 204 response for OPTIONS preflight requests. */
export function corsPreflightResponse(): Response {
	return new Response(null, { status: 204, headers: corsHeaders() });
}

/** Wraps a JSON body with CORS headers. */
export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders()
		}
	});
}

/** Wraps an error message with CORS headers. */
export function errorResponse(error: string, status: number): Response {
	return jsonResponse({ error }, status);
}
