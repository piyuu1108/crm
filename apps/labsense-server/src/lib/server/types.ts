// ── Agent API Types ──────────────────────────────────────────

export interface LoginPayload {
	collegeId: string;
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

export interface SegmentPayload {
	startedAt: string;
	endedAt: string;
}

export interface DetailPayload {
	title: string;
	url?: string;
	domain?: string;
	totalSeconds: number;
	activeSeconds: number;
	idleSeconds: number;
	segments?: SegmentPayload[];
}

export interface AppUsagePayload {
	appName: string;
	totalSeconds: number;
	activeSeconds: number;
	idleSeconds: number;
	segments?: SegmentPayload[];
	details?: DetailPayload[];
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
