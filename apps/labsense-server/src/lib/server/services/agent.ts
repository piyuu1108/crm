import { db } from '$lib/server/db';
import { students, machines, labSessions, systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '$lib/server/auth';

/**
 * Authenticates a student by ID and password.
 * Returns the student record (without password_hash) on success, or an error string.
 */
export async function authenticateStudent(
	collegeId: string,
	password: string
): Promise<{ ok: true; student: { id: string; name: string } } | { ok: false; error: string; status: number }> {
	const [student] = await db
		.select({
			id: students.id,
			name: students.name,
			passwordHash: students.passwordHash,
			isActive: students.isActive
		})
		.from(students)
		.where(eq(students.id, collegeId.toUpperCase()));

	if (!student) {
		return { ok: false, error: 'Invalid student ID or password', status: 401 };
	}

	if (!student.isActive) {
		return { ok: false, error: 'Account is inactive', status: 403 };
	}

	const valid = await verifyPassword(student.passwordHash, password);
	if (!valid) {
		return { ok: false, error: 'Invalid student ID or password', status: 401 };
	}

	return { ok: true, student: { id: student.id, name: student.name } };
}

/**
 * Creates a machine if it doesn't exist (by hardware_id), otherwise updates pc_name/lab_name.
 * Always updates last_seen_at. Returns the machine ID.
 */
export async function upsertMachine(
	hardwareId: string,
	pcName: string,
	labName?: string
): Promise<string> {
	const now = new Date();

	const [result] = await db
		.insert(machines)
		.values({
			hardwareId,
			pcName,
			labName: labName ?? null,
			lastSeenAt: now
		})
		.onConflictDoUpdate({
			target: machines.hardwareId,
			set: {
				pcName,
				labName: labName ?? null,
				lastSeenAt: now
			}
		})
		.returning({ id: machines.id });

	return result.id;
}

/**
 * Creates a new active lab session for a student on a machine.
 * Uses server-side timestamps only.
 */
export async function createLabSession(
	collegeId: string,
	machineId: string
): Promise<string> {
	const now = new Date();

	const [session] = await db
		.insert(labSessions)
		.values({
			studentId: collegeId.toUpperCase(),
			machineId,
			loginAt: now,
			lastSyncAt: now,
			status: 'active'
		})
		.returning({ id: labSessions.id });

	return session.id;
}

/**
 * Reads the singleton system_settings row.
 * Returns defaults if no row exists (shouldn't happen after seeding).
 */
export async function getSystemSettings(): Promise<{
	syncIntervalSeconds: number;
	syncJitterSeconds: number;
	schedulingMode: 'random_jitter' | 'deterministic_slot';
	timeoutSeconds: number;
	idleThresholdSeconds: number;
	enableDetails: boolean;
	enableSegments: boolean;
	maxSegmentsPerApp: number;
	maxSegmentsPerDetail: number;
	maxDetailsPerApp: number;
	minimumTrackedSeconds: number;
	candidateRetentionMinutes: number;
}> {
	const [settings] = await db.select().from(systemSettings).limit(1);

	if (!settings) {
		return {
			syncIntervalSeconds: 30,
			syncJitterSeconds: 30,
			schedulingMode: 'deterministic_slot',
			timeoutSeconds: 120,
			idleThresholdSeconds: 120,
			enableDetails: true,
			enableSegments: true,
			maxSegmentsPerApp: 50,
			maxSegmentsPerDetail: 20,
			maxDetailsPerApp: 50,
			minimumTrackedSeconds: 15,
			candidateRetentionMinutes: 10
		};
	}

	return {
		syncIntervalSeconds: settings.syncIntervalSeconds,
		syncJitterSeconds: settings.syncJitterSeconds,
		schedulingMode: settings.schedulingMode as 'random_jitter' | 'deterministic_slot',
		timeoutSeconds: settings.timeoutSeconds,
		idleThresholdSeconds: settings.idleThresholdSeconds,
		enableDetails: settings.enableDetails,
		enableSegments: settings.enableSegments,
		maxSegmentsPerApp: settings.maxSegmentsPerApp,
		maxSegmentsPerDetail: settings.maxSegmentsPerDetail,
		maxDetailsPerApp: settings.maxDetailsPerApp,
		minimumTrackedSeconds: settings.minimumTrackedSeconds,
		candidateRetentionMinutes: settings.candidateRetentionMinutes
	};
}
