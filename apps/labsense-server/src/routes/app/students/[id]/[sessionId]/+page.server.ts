import { db } from '$lib/server/db';
import { students, labSessions, machines, sessionApps } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id: studentId, sessionId } = params;

	const [student] = await db
		.select()
		.from(students)
		.where(eq(students.id, studentId))
		.limit(1);

	if (!student) {
		throw error(404, 'Student not found');
	}

	const [session] = await db
		.select({
			id: labSessions.id,
			loginAt: labSessions.loginAt,
			logoutAt: labSessions.logoutAt,
			totalSeconds: labSessions.totalSeconds,
			activeSeconds: labSessions.activeSeconds,
			idleSeconds: labSessions.idleSeconds,
			status: labSessions.status,
			endReason: labSessions.endReason,
			machineName: machines.pcName,
			labName: machines.labName,
			hardwareId: machines.hardwareId
		})
		.from(labSessions)
		.leftJoin(machines, eq(labSessions.machineId, machines.id))
		.where(and(eq(labSessions.id, sessionId), eq(labSessions.studentId, studentId)))
		.limit(1);

	if (!session) {
		throw error(404, 'Session not found');
	}

	const apps = await db
		.select()
		.from(sessionApps)
		.where(eq(sessionApps.sessionId, sessionId))
		.orderBy(sessionApps.totalSeconds);

	return {
		student,
		session,
		apps
	};
};

export const actions: Actions = {
	delete: async ({ params }) => {
		const { id: studentId, sessionId } = params;

		try {
			// Cascade chain: labSessions → sessionApps → sessionDetails → activitySegments
			await db.delete(labSessions).where(and(
				eq(labSessions.id, sessionId),
				eq(labSessions.studentId, studentId)
			));
		} catch (err) {
			console.error('[delete-session] Error:', err);
			throw error(500, 'Failed to delete session');
		}

		throw redirect(303, `/app/students/${studentId}`);
	}
};
