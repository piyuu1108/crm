import type { LoginPayload, SyncPayload, ValidationResult } from '$lib/server/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a UUID string format. */
export function isValidUUID(value: unknown): value is string {
	return typeof value === 'string' && UUID_RE.test(value);
}

/** Ensures a value is a non-negative integer. */
function isNonNegativeInt(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Ensures a value is a non-empty string. */
function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/** Validates the POST /api/agent/login request body. */
export function validateLoginPayload(body: unknown): ValidationResult<LoginPayload> {
	if (!body || typeof body !== 'object') {
		return { ok: false, error: 'Request body must be a JSON object' };
	}

	const b = body as Record<string, unknown>;

	if (!isNonEmptyString(b.collegeId)) {
		return { ok: false, error: 'collegeId is required and must be a non-empty string' };
	}
	if (!isNonEmptyString(b.password)) {
		return { ok: false, error: 'password is required and must be a non-empty string' };
	}
	if (!isNonEmptyString(b.hardwareId)) {
		return { ok: false, error: 'hardwareId is required and must be a non-empty string' };
	}
	if (!isNonEmptyString(b.pcName)) {
		return { ok: false, error: 'pcName is required and must be a non-empty string' };
	}
	if (b.labName !== undefined && b.labName !== null && typeof b.labName !== 'string') {
		return { ok: false, error: 'labName must be a string if provided' };
	}

	return {
		ok: true,
		data: {
			collegeId: b.collegeId.trim().toUpperCase(),
			password: b.password,
			hardwareId: b.hardwareId.trim(),
			pcName: b.pcName.trim(),
			labName: typeof b.labName === 'string' ? b.labName.trim() || undefined : undefined
		}
	};
}

/** Validates the PATCH /api/sessions/:id request body. */
export function validateSyncPayload(body: unknown): ValidationResult<SyncPayload> {
	if (!body || typeof body !== 'object') {
		return { ok: false, error: 'Request body must be a JSON object' };
	}

	const b = body as Record<string, unknown>;

	if (!isNonNegativeInt(b.totalSeconds)) {
		return { ok: false, error: 'totalSeconds must be a non-negative integer' };
	}
	if (!isNonNegativeInt(b.activeSeconds)) {
		return { ok: false, error: 'activeSeconds must be a non-negative integer' };
	}
	if (!isNonNegativeInt(b.idleSeconds)) {
		return { ok: false, error: 'idleSeconds must be a non-negative integer' };
	}

	if (!Array.isArray(b.applications)) {
		return { ok: false, error: 'applications must be an array' };
	}

	const apps = [];
	for (let i = 0; i < b.applications.length; i++) {
		const app = b.applications[i] as Record<string, unknown>;
		if (!app || typeof app !== 'object') {
			return { ok: false, error: `applications[${i}] must be an object` };
		}
		if (!isNonEmptyString(app.appName)) {
			return { ok: false, error: `applications[${i}].appName is required` };
		}
		if (!isNonNegativeInt(app.totalSeconds)) {
			return { ok: false, error: `applications[${i}].totalSeconds must be a non-negative integer` };
		}
		if (!isNonNegativeInt(app.activeSeconds)) {
			return { ok: false, error: `applications[${i}].activeSeconds must be a non-negative integer` };
		}
		if (!isNonNegativeInt(app.idleSeconds)) {
			return { ok: false, error: `applications[${i}].idleSeconds must be a non-negative integer` };
		}
		apps.push({
			appName: app.appName.trim(),
			totalSeconds: app.totalSeconds,
			activeSeconds: app.activeSeconds,
			idleSeconds: app.idleSeconds
		});
	}

	return {
		ok: true,
		data: {
			totalSeconds: b.totalSeconds,
			activeSeconds: b.activeSeconds,
			idleSeconds: b.idleSeconds,
			applications: apps
		}
	};
}

/** Safely parses a JSON request body, returning null on failure. */
export async function parseJsonBody(request: Request): Promise<unknown | null> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}
