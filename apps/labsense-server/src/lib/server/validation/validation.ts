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

	if (!isNonNegativeInt(b.sequenceNumber)) {
		return { ok: false, error: 'sequenceNumber must be a non-negative integer' };
	}
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

	const validateSegments = (segs: unknown, path: string) => {
		if (segs === undefined || segs === null) return [];
		if (!Array.isArray(segs)) throw new Error(`${path} must be an array`);
		return segs.map((s, j) => {
			if (!s || typeof s !== 'object') throw new Error(`${path}[${j}] must be an object`);
			const startedAt = s.startedAt as string;
			const endedAt = s.endedAt as string;
			if (isNaN(Date.parse(startedAt)) || isNaN(Date.parse(endedAt))) {
				throw new Error(`${path}[${j}] contains invalid dates`);
			}
			return { startedAt, endedAt };
		});
	};

	try {
		const apps = b.applications.map((app, i) => {
			if (!app || typeof app !== 'object') throw new Error(`applications[${i}] must be an object`);
			if (!isNonEmptyString(app.appName)) throw new Error(`applications[${i}].appName is required`);
			if (!isNonNegativeInt(app.totalSeconds))
				throw new Error(`applications[${i}].totalSeconds must be a non-negative integer`);
			if (!isNonNegativeInt(app.activeSeconds))
				throw new Error(`applications[${i}].activeSeconds must be a non-negative integer`);
			if (!isNonNegativeInt(app.idleSeconds))
				throw new Error(`applications[${i}].idleSeconds must be a non-negative integer`);

			const details = Array.isArray(app.details)
				? app.details.map((d, j) => {
						if (!d || typeof d !== 'object') throw new Error(`applications[${i}].details[${j}] must be an object`);
						if (!isNonEmptyString(d.title)) throw new Error(`applications[${i}].details[${j}].title is required`);
						if (!isNonNegativeInt(d.totalSeconds))
							throw new Error(`applications[${i}].details[${j}].totalSeconds must be integer`);
						if (!isNonNegativeInt(d.activeSeconds))
							throw new Error(`applications[${i}].details[${j}].activeSeconds must be integer`);
						if (!isNonNegativeInt(d.idleSeconds))
							throw new Error(`applications[${i}].details[${j}].idleSeconds must be integer`);

						return {
							title: d.title.trim(),
							url: typeof d.url === 'string' ? d.url.trim() : undefined,
							domain: typeof d.domain === 'string' ? d.domain.trim() : undefined,
							totalSeconds: d.totalSeconds,
							activeSeconds: d.activeSeconds,
							idleSeconds: d.idleSeconds,
							segments: validateSegments(d.segments, `applications[${i}].details[${j}].segments`)
						};
					})
				: [];

			return {
				appName: app.appName.trim(),
				totalSeconds: app.totalSeconds,
				activeSeconds: app.activeSeconds,
				idleSeconds: app.idleSeconds,
				segments: validateSegments(app.segments, `applications[${i}].segments`),
				details
			};
		});

		return {
			ok: true,
			data: {
				sequenceNumber: b.sequenceNumber,
				totalSeconds: b.totalSeconds,
				activeSeconds: b.activeSeconds,
				idleSeconds: b.idleSeconds,
				applications: apps
			}
		};
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Validation failed' };
	}
}

/** Safely parses a JSON request body, returning null on failure. */
export async function parseJsonBody(request: Request): Promise<unknown | null> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}
