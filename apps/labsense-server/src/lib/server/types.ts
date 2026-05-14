// ── Agent API Types ──────────────────────────────────────────

export interface LoginPayload {
	studentId: string;
	password: string;
	hardwareId: string;
	pcName: string;
	labName?: string;
}

export interface LoginResponse {
	sessionId: string;
	syncIntervalSeconds: number;
	syncJitterSeconds: number;
	timeoutSeconds: number;
}

export interface AppUsagePayload {
	appName: string;
	totalSeconds: number;
	activeSeconds: number;
	idleSeconds: number;
}

export interface SyncPayload {
	totalSeconds: number;
	activeSeconds: number;
	idleSeconds: number;
	applications: AppUsagePayload[];
}

export interface SuccessResponse {
	success: true;
}

export interface ErrorResponse {
	error: string;
}

// ── Validation ──────────────────────────────────────────────

export type ValidationResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string };
