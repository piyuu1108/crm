import { db } from '$lib/server/db';
import { labSessions, sessionApps, machines, sessionDetails, activitySegments } from '$lib/server/db/schema';
import { eq, and, lt, sql, not, inArray, isNull } from 'drizzle-orm';
import type { SyncPayload } from '$lib/server/types';

/**
 * Syncs session data from the agent. Runs in a single transaction:
 * 1. Validates session exists and is active
 * 2. Updates session aggregates + machine last_seen_at
 * 3. Bulk upserts application aggregates
 * 4. Bulk upserts detail aggregates
 * 5. Bulk upserts activity segments (both app-level and detail-level)
 * 6. Symmetrically prunes segments that were evicted from the agent's buffer
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

		// 2. Update session aggregates & machine last_seen
		await tx
			.update(labSessions)
			.set({
				totalSeconds: payload.totalSeconds,
				activeSeconds: payload.activeSeconds,
				idleSeconds: payload.idleSeconds,
				lastSyncAt: now
			})
			.where(eq(labSessions.id, sessionId));

		await tx
			.update(machines)
			.set({ lastSeenAt: now })
			.where(eq(machines.id, session.machineId));

		// ─── Phase A: Bulk Upsert Applications ───────────────────

		if (payload.applications.length === 0) {
			return { ok: true };
		}

		// Fix 3: Deterministic Sort to prevent Deadlocks
		const sortedApps = [...payload.applications].sort((a, b) => a.appName.localeCompare(b.appName));

		const appValues = sortedApps.map((app) => ({
			sessionId,
			appName: app.appName,
			totalSeconds: app.totalSeconds,
			activeSeconds: app.activeSeconds,
			idleSeconds: app.idleSeconds,
			updatedAt: now
		}));

		const upsertedApps = await tx
			.insert(sessionApps)
			.values(appValues)
			.onConflictDoUpdate({
				target: [sessionApps.sessionId, sessionApps.appName],
				set: {
					// Fix 2: Monotonicity Guard (Time-Travel Fix)
					totalSeconds: sql`GREATEST(${sessionApps.totalSeconds}, EXCLUDED.total_seconds)`,
					activeSeconds: sql`GREATEST(${sessionApps.activeSeconds}, EXCLUDED.active_seconds)`,
					idleSeconds: sql`GREATEST(${sessionApps.idleSeconds}, EXCLUDED.idle_seconds)`,
					updatedAt: sql`EXCLUDED.updated_at`
				}
			})
			.returning({ id: sessionApps.id, appName: sessionApps.appName });

		// Map appName to database UUID
		const appMap = new Map(upsertedApps.map((a) => [a.appName, a.id]));

		// ─── Phase B: Bulk Upsert Details ────────────────────────

		const detailValues: any[] = [];

		for (const app of sortedApps) {
			const appId = appMap.get(app.appName);
			if (!appId || !app.details) continue;

			// Fix 3: Sort details deterministically
			const sortedDetails = [...app.details].sort((a, b) => {
				const titleCmp = (a.title || '').localeCompare(b.title || '');
				if (titleCmp !== 0) return titleCmp;
				return (a.url || '').localeCompare(b.url || '');
			});

			for (const detail of sortedDetails) {
				detailValues.push({
					appId,
					title: detail.title,
					url: detail.url ?? null,
					domain: detail.domain ?? null,
					totalSeconds: detail.totalSeconds,
					activeSeconds: detail.activeSeconds,
					idleSeconds: detail.idleSeconds,
					updatedAt: now
				});
			}
		}

		let detailMap = new Map<string, string>();
		if (detailValues.length > 0) {
			const upsertedDetails = await tx
				.insert(sessionDetails)
				.values(detailValues)
				.onConflictDoUpdate({
					target: [sessionDetails.appId, sessionDetails.title, sessionDetails.url],
					set: {
						// Fix 2: Monotonicity Guard
						totalSeconds: sql`GREATEST(${sessionDetails.totalSeconds}, EXCLUDED.total_seconds)`,
						activeSeconds: sql`GREATEST(${sessionDetails.activeSeconds}, EXCLUDED.active_seconds)`,
						idleSeconds: sql`GREATEST(${sessionDetails.idleSeconds}, EXCLUDED.idle_seconds)`,
						updatedAt: sql`EXCLUDED.updated_at`
					}
				})
				.returning({
					id: sessionDetails.id,
					appId: sessionDetails.appId,
					title: sessionDetails.title,
					url: sessionDetails.url
				});

			// Map (appId|title|url) to database UUID
			detailMap = new Map(
				upsertedDetails.map((d) => [`${d.appId}|${d.title}|${d.url}`, d.id])
			);
		}

		// ─── Phase C: Bulk Upsert Segments ────────────────────────

		const segmentValues: any[] = [];

		for (const app of sortedApps) {
			const appId = appMap.get(app.appName);
			if (!appId) continue;

			// App-level segments
			if (app.segments) {
				for (const s of app.segments) {
					segmentValues.push({
						sessionId,
						appId,
						detailId: null,
						startedAt: new Date(s.startedAt),
						endedAt: new Date(s.endedAt)
					});
				}
			}

			// Detail-level segments
			if (app.details) {
				for (const detail of app.details) {
					const detailId = detailMap.get(`${appId}|${detail.title}|${detail.url ?? null}`);
					if (!detailId || !detail.segments) continue;

					for (const s of detail.segments) {
						segmentValues.push({
							sessionId,
							appId,
							detailId,
							startedAt: new Date(s.startedAt),
							endedAt: new Date(s.endedAt)
						});
					}
				}
			}
		}

		if (segmentValues.length > 0) {
			// Fix 3: Sort segments to prevent Deadlocks
			segmentValues.sort((a, b) => {
				if (a.appId !== b.appId) return a.appId.localeCompare(b.appId);
				if (a.detailId !== b.detailId) return (a.detailId || '').localeCompare(b.detailId || '');
				return a.startedAt.getTime() - b.startedAt.getTime();
			});

			// Chunk segments to avoid PostgreSQL parameter limit (65,535)
			const CHUNK_SIZE = 5000;
			for (let i = 0; i < segmentValues.length; i += CHUNK_SIZE) {
				const chunk = segmentValues.slice(i, i + CHUNK_SIZE);
				await tx
					.insert(activitySegments)
					.values(chunk)
					.onConflictDoUpdate({
						target: [
							activitySegments.sessionId,
							activitySegments.appId,
							activitySegments.detailId,
							activitySegments.startedAt
						],
						set: {
							endedAt: sql`GREATEST(${activitySegments.endedAt}, EXCLUDED.ended_at)`
						}
					});
			}

			// ─── Phase D: Surgical Pruning ───────────────────────────
			// Any segment for an active app/detail that is NOT in the current 
			// snapshot must be pruned to respect the "Rolling Window" settings.

			for (const app of sortedApps) {
				const appId = appMap.get(app.appName);
				if (!appId) continue;

				// Prune app-level segments
				const appSegStarts = app.segments?.map((s) => new Date(s.startedAt)) || [];
				if (appSegStarts.length > 0) {
					await tx.delete(activitySegments).where(
						and(
							eq(activitySegments.sessionId, sessionId),
							eq(activitySegments.appId, appId),
							isNull(activitySegments.detailId),
							not(inArray(activitySegments.startedAt, appSegStarts))
						)
					);
				}

				// Prune detail-level segments
				if (app.details) {
					for (const detail of app.details) {
						const detailId = detailMap.get(`${appId}|${detail.title}|${detail.url ?? null}`);
						const detailSegStarts = detail.segments?.map((s) => new Date(s.startedAt)) || [];
						if (detailId && detailSegStarts.length > 0) {
							await tx.delete(activitySegments).where(
								and(
									eq(activitySegments.sessionId, sessionId),
									eq(activitySegments.appId, appId),
									eq(activitySegments.detailId, detailId),
									not(inArray(activitySegments.startedAt, detailSegStarts))
								)
							);
						}
					}
				}
			}
		}

		return { ok: true };
	});
}

/**
 * Marks a session as completed with reason = logout.
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
 * Batch-updates all active sessions whose last_sync_at is older than the threshold.
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
