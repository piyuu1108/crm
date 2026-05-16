import { db } from '$lib/server/db';
import { labSessions, sessionApps, machines, sessionDetails, activitySegments } from '$lib/server/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import type { SyncPayload } from '$lib/server/types';

/**
 * Syncs session data from the agent. Runs in a single transaction:
 * 1. Validates session exists and is active
 * 2. Updates session aggregates + last_sync_at
 * 3. Updates machine last_seen_at
 * 4. Upserts application usage aggregates
 * 5. Upserts application details
 * 6. Inserts activity segments (deduplicated by unique constraint)
 */
export async function syncSession(
	sessionId: string,
	payload: SyncPayload
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
	return await db.transaction(async (tx) => {
		// 1. Fetch session + verify state
		const [session] = await tx
			.select({
				id: labSessions.id,
				machineId: labSessions.machineId,
				status: labSessions.status
			})
			.from(labSessions)
			.where(eq(labSessions.id, sessionId));

		if (!session) {
			return { ok: false, error: 'Session not found', status: 404 };
		}

		if (session.status === 'completed') {
			return { ok: false, error: 'Session is already completed', status: 409 };
		}

		const now = new Date();

		// 2. Update session aggregates
		await tx
			.update(labSessions)
			.set({
				totalSeconds: payload.totalSeconds,
				activeSeconds: payload.activeSeconds,
				idleSeconds: payload.idleSeconds,
				lastSyncAt: now
			})
			.where(eq(labSessions.id, sessionId));

		// 3. Update machine last_seen_at
		await tx
			.update(machines)
			.set({ lastSeenAt: now })
			.where(eq(machines.id, session.machineId));

		// 4. Upsert application aggregates
		for (const app of payload.applications) {
			const [upsertedApp] = await tx
				.insert(sessionApps)
				.values({
					sessionId,
					appName: app.appName,
					totalSeconds: app.totalSeconds,
					activeSeconds: app.activeSeconds,
					idleSeconds: app.idleSeconds,
					updatedAt: now
				})
				.onConflictDoUpdate({
					target: [sessionApps.sessionId, sessionApps.appName],
					set: {
						totalSeconds: app.totalSeconds,
						activeSeconds: app.activeSeconds,
						idleSeconds: app.idleSeconds,
						updatedAt: now
					}
				})
				.returning({ id: sessionApps.id });

			// 5. Upsert application details
			if (app.details && app.details.length > 0) {
				for (const detail of app.details) {
					const [upsertedDetail] = await tx
						.insert(sessionDetails)
						.values({
							appId: upsertedApp.id,
							title: detail.title,
							url: detail.url ?? null,
							domain: detail.domain ?? null,
							totalSeconds: detail.totalSeconds,
							activeSeconds: detail.activeSeconds,
							idleSeconds: detail.idleSeconds,
							updatedAt: now
						})
						.onConflictDoUpdate({
							target: [sessionDetails.appId, sessionDetails.title, sessionDetails.url],
							set: {
								totalSeconds: detail.totalSeconds,
								activeSeconds: detail.activeSeconds,
								idleSeconds: detail.idleSeconds,
								updatedAt: now
							}
						})
						.returning({ id: sessionDetails.id });

					// 6. Insert detail segments
					if (detail.segments && detail.segments.length > 0) {
						await tx
							.insert(activitySegments)
							.values(
								detail.segments.map((s) => ({
									sessionId,
									appId: upsertedApp.id,
									detailId: upsertedDetail.id,
									startedAt: new Date(s.startedAt),
									endedAt: new Date(s.endedAt)
								}))
							)
							.onConflictDoNothing();
					}
				}
			}

			// 7. Insert app segments
			if (app.segments && app.segments.length > 0) {
				await tx
					.insert(activitySegments)
					.values(
						app.segments.map((s) => ({
							sessionId,
							appId: upsertedApp.id,
							startedAt: new Date(s.startedAt),
							endedAt: new Date(s.endedAt)
						}))
					)
					.onConflictDoNothing();
			}
		}

		return { ok: true };
	});
}

/**
 * Marks a session as completed with reason = logout.
 * Rejects sessions that are already completed.
 */
export async function logoutSession(
	sessionId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
	const [session] = await db
		.select({
			id: labSessions.id,
			status: labSessions.status
		})
		.from(labSessions)
		.where(eq(labSessions.id, sessionId));

	if (!session) {
		return { ok: false, error: 'Session not found', status: 404 };
	}

	if (session.status === 'completed') {
		return { ok: false, error: 'Session is already completed', status: 409 };
	}

	const now = new Date();

	await db
		.update(labSessions)
		.set({
			status: 'completed',
			endReason: 'logout',
			logoutAt: now,
			lastSyncAt: now
		})
		.where(eq(labSessions.id, sessionId));

	return { ok: true };
}

/**
 * Batch-updates all active sessions whose last_sync_at is older than the
 * timeout threshold. Marks them as completed with reason = timeout.
 * Returns the count of timed-out sessions.
 */
export async function sweepTimedOutSessions(timeoutSeconds: number): Promise<number> {
	const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
	const now = new Date();

	const result = await db
		.update(labSessions)
		.set({
			status: 'completed',
			endReason: 'timeout',
			logoutAt: now
		})
		.where(
			and(
				eq(labSessions.status, 'active'),
				lt(labSessions.lastSyncAt, cutoff)
			)
		)
		.returning({ id: labSessions.id });

	return result.length;
}
