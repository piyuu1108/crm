import { db } from '$lib/server/db';
import { students, labSessions, machines, sessionApps, activitySegments } from '$lib/server/db/schema';
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
			await db.transaction(async (tx) => {
				// 1. Delete segments (direct FK to session)
				await tx.delete(activitySegments).where(eq(activitySegments.sessionId, sessionId));
				
				// 2. Delete apps (direct FK to session). 
				// Note: sessionDetails will cascade from apps because it has onDelete: 'cascade'
				await tx.delete(sessionApps).where(eq(sessionApps.sessionId, sessionId));

				// 3. Delete the session itself
				await tx.delete(labSessions).where(and(
					eq(labSessions.id, sessionId),
					eq(labSessions.studentId, studentId)
				));
			});
		} catch (err) {
			console.error('[delete-session] Error:', err);
			throw error(500, 'Failed to delete session');
		}

		throw redirect(303, `/app/students/${studentId}`);
	}
};
