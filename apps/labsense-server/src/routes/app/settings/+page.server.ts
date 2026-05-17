import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { PASSWD } from '$env/static/private';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, 1)).limit(1);

	// Default values if no record exists
	return {
		settings: settings || {
			syncIntervalSeconds: 30,
			syncJitterSeconds: 30,
			timeoutSeconds: 120,
			idleThresholdSeconds: 120,
			enableDetails: true,
			enableSegments: true,
			maxSegmentsPerApp: 50,
			maxSegmentsPerDetail: 20,
			maxDetailsPerApp: 50,
			minimumTrackedSeconds: 15,
			candidateRetentionMinutes: 10
		}
	};
};

export const actions: Actions = {
	updateSettings: async ({ request }) => {
		const formData = await request.formData();
		const syncIntervalSeconds = parseInt(formData.get('syncIntervalSeconds') as string);
		const syncJitterSeconds = parseInt(formData.get('syncJitterSeconds') as string);
		const timeoutSeconds = parseInt(formData.get('timeoutSeconds') as string);
		const idleThresholdSeconds = parseInt(formData.get('idleThresholdSeconds') as string);
		const enableDetails = formData.get('enableDetails') === 'true';
		const enableSegments = formData.get('enableSegments') === 'true';
		const maxSegmentsPerApp = parseInt(formData.get('maxSegmentsPerApp') as string);
		const maxSegmentsPerDetail = parseInt(formData.get('maxSegmentsPerDetail') as string);
		const maxDetailsPerApp = parseInt(formData.get('maxDetailsPerApp') as string);
		const minimumTrackedSeconds = parseInt(formData.get('minimumTrackedSeconds') as string);
		const candidateRetentionMinutes = parseInt(formData.get('candidateRetentionMinutes') as string);
		const confirmationPassword = formData.get('confirmationPassword') as string;

		if (
			isNaN(syncIntervalSeconds) ||
			isNaN(syncJitterSeconds) ||
			isNaN(timeoutSeconds) ||
			isNaN(idleThresholdSeconds) ||
			isNaN(maxSegmentsPerApp) ||
			isNaN(maxSegmentsPerDetail) ||
			isNaN(maxDetailsPerApp) ||
			isNaN(minimumTrackedSeconds) ||
			isNaN(candidateRetentionMinutes)
		) {
			return fail(400, { message: 'Invalid values' });
		}

		if (confirmationPassword !== PASSWD) {
			return fail(401, { message: 'Invalid security password' });
		}

		await db
			.insert(systemSettings)
			.values({
				id: 1,
				syncIntervalSeconds,
				syncJitterSeconds,
				timeoutSeconds,
				idleThresholdSeconds,
				enableDetails,
				enableSegments,
				maxSegmentsPerApp,
				maxSegmentsPerDetail,
				maxDetailsPerApp,
				minimumTrackedSeconds,
				candidateRetentionMinutes,
				updatedAt: new Date()
			})
			.onConflictDoUpdate({
				target: systemSettings.id,
				set: {
					syncIntervalSeconds,
					syncJitterSeconds,
					timeoutSeconds,
					idleThresholdSeconds,
					enableDetails,
					enableSegments,
					maxSegmentsPerApp,
					maxSegmentsPerDetail,
					maxDetailsPerApp,
					minimumTrackedSeconds,
					candidateRetentionMinutes,
					updatedAt: new Date()
				}
			});

		return { success: true, message: 'Settings updated successfully' };
	}
};
