import { sweepTimedOutSessions } from '$lib/server/services/session';
import { getSystemSettings } from '$lib/server/services/agent';

const SWEEP_INTERVAL_MS = 30_000; // Check every 30 seconds

let intervalId: ReturnType<typeof setInterval> | null = null;
let isSweeping = false;

/**
 * Starts the lightweight timeout sweeper.
 * Reads timeout_seconds from system_settings on each tick so that
 * admin changes take effect immediately without a restart.
 */
export function startTimeoutSweeper(): void {
	if (intervalId) return; // Already running

	console.log('[timeout-sweeper] Started (interval: 30s)');

	intervalId = setInterval(async () => {
		if (isSweeping) return;
		isSweeping = true;
		try {
			const settings = await getSystemSettings();
			const count = await sweepTimedOutSessions(settings.timeoutSeconds);
			if (count > 0) {
				console.log(`[timeout-sweeper] Timed out ${count} session(s)`);
			}
		} catch (err) {
			console.error('[timeout-sweeper] Error during sweep:', err);
		} finally {
			isSweeping = false;
		}
	}, SWEEP_INTERVAL_MS);
}

/** Stops the timeout sweeper (for graceful shutdown). */
export function stopTimeoutSweeper(): void {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
		console.log('[timeout-sweeper] Stopped');
	}
}
