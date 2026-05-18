import { db } from '$lib/server/db';
import { labSessions, sessionApps, machines, sessionDetails, activitySegments } from '$lib/server/db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import type { SyncPayload } from '$lib/server/types';

/**
 * Syncs session data from the agent. Runs in a single transaction:
 * 1. Validates session exists, is active, and sequence number is monotonic
 * 2. Updates session aggregates (Monotonic) + machine last_seen
 * 3. Bulk upserts apps, details, and segments (Monotonic)
 * 4. Symmetric Bulk Pruning for both segments and details
 */
export async function syncSession(
	sessionId: string,
	payload: SyncPayload
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
	return await db.transaction(async (tx) => {
		// 1. Fetch session + verify state + validate sequence number
		const [session] = await tx
			.select({
				id: labSessions.id,
				machineId: labSessions.machineId,
				status: labSessions.status,
				lastSequenceNumber: labSessions.lastSequenceNumber
			})
			.from(labSessions)
			.where(eq(labSessions.id, sessionId));

		if (!session) {
			return { ok: false, error: 'Session not found', status: 404 };
		}

		if (session.status === 'completed') {
			return { ok: false, error: 'Session is already completed', status: 409 };
		}

		// Fix 4: Monotonic Sequence Number Validation
		// Reject out-of-order or replayed packets
		if (payload.sequenceNumber <= session.lastSequenceNumber) {
			return { ok: false, error: 'Out-of-order or duplicate sync packet', status: 400 };
		}

		const now = new Date();

		// 2. Update session aggregates
		await tx
			.update(labSessions)
			.set({
				lastSequenceNumber: payload.sequenceNumber,
				totalSeconds: sql`GREATEST(${labSessions.totalSeconds}, ${payload.totalSeconds})`,
				activeSeconds: sql`GREATEST(${labSessions.activeSeconds}, ${payload.activeSeconds})`,
				idleSeconds: sql`GREATEST(${labSessions.idleSeconds}, ${payload.idleSeconds})`,
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
					totalSeconds: sql`GREATEST(${sessionApps.totalSeconds}, EXCLUDED.total_seconds)`,
					activeSeconds: sql`GREATEST(${sessionApps.activeSeconds}, EXCLUDED.active_seconds)`,
					idleSeconds: sql`GREATEST(${sessionApps.idleSeconds}, EXCLUDED.idle_seconds)`,
					updatedAt: sql`EXCLUDED.updated_at`
				}
			})
			.returning({ id: sessionApps.id, appName: sessionApps.appName });

		const appMap = new Map(upsertedApps.map((a) => [a.appName, a.id]));

		// ─── Phase B: Bulk Upsert Details ────────────────────────

		const detailValues: any[] = [];
		const keepDetails: string[] = []; // For Phase E

function escapeSqlString(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\0/g, '');
}

		for (const app of sortedApps) {
			const appId = appMap.get(app.appName);
			if (!appId || !app.details) continue;

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
				const u = detail.url ? `'${escapeSqlString(detail.url)}'` : 'NULL';
				keepDetails.push(`('${appId}', '${escapeSqlString(detail.title ?? '')}', ${u})`);
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

			detailMap = new Map(
				upsertedDetails.map((d) => [`${d.appId}|${d.title}|${d.url}`, d.id])
			);
		}

		// ─── Phase C: Bulk Upsert Segments ────────────────────────

		const segmentValues: any[] = [];
		const keepSegments: string[] = []; // For Phase D

		for (const app of sortedApps) {
			const appId = appMap.get(app.appName);
			if (!appId) continue;

			const appSegments = app.segments || [];
			for (const s of appSegments) {
				const start = new Date(s.startedAt).toISOString();
				segmentValues.push({
					sessionId,
					appId,
					detailId: null,
					startedAt: new Date(s.startedAt),
					endedAt: new Date(s.endedAt)
				});
				keepSegments.push(`('${appId}', NULL, '${start}'::timestamptz)`);
			}

			if (app.details) {
				for (const detail of app.details) {
					const detailId = detailMap.get(`${appId}|${detail.title}|${detail.url ?? null}`);
					if (!detailId || !detail.segments) continue;

					for (const s of detail.segments) {
						const start = new Date(s.startedAt).toISOString();
						segmentValues.push({
							sessionId,
							appId,
							detailId,
							startedAt: new Date(s.startedAt),
							endedAt: new Date(s.endedAt)
						});
						keepSegments.push(`('${appId}', '${detailId}', '${start}'::timestamptz)`);
					}
				}
			}
		}

		if (segmentValues.length > 0) {
			segmentValues.sort((a, b) => {
				if (a.appId !== b.appId) return a.appId.localeCompare(b.appId);
				if (a.detailId !== b.detailId) return (a.detailId || '').localeCompare(b.detailId || '');
				return a.startedAt.getTime() - b.startedAt.getTime();
			});

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
		}

		// ─── Phase D: Null-Safe Segment Pruning ──────────────────
		if (keepSegments.length > 0) {
			const keepTuples = keepSegments.join(', ');
			await tx.execute(sql.raw(`
				DELETE FROM activity_segments 
				WHERE session_id = '${sessionId}' 
				AND NOT EXISTS (
					SELECT 1 FROM (VALUES ${keepTuples}) AS k(aid, did, s)
					WHERE k.aid::uuid = activity_segments.app_id 
					AND k.did::uuid IS NOT DISTINCT FROM activity_segments.detail_id
					AND k.s = activity_segments.started_at
				)
			`));
		}

		// ─── Phase E: Zombie Detail Pruning ──────────────────────
		if (keepDetails.length > 0) {
			const keepDetailTuples = keepDetails.join(', ');
			await tx.execute(sql.raw(`
				DELETE FROM session_details
				WHERE app_id IN (SELECT id FROM session_apps WHERE session_id = '${sessionId}')
				AND NOT EXISTS (
					SELECT 1 FROM (VALUES ${keepDetailTuples}) AS k(aid, t, u)
					WHERE k.aid::uuid = session_details.app_id
					AND k.t = session_details.title
					AND k.u IS NOT DISTINCT FROM session_details.url
				)
			`));
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
