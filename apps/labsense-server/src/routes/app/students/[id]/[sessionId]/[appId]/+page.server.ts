import { db } from '$lib/server/db';
import { students, labSessions, sessionApps, sessionDetails, activitySegments } from '$lib/server/db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id: studentId, sessionId, appId } = params;

	// 1. Fetch Student
	const [student] = await db
		.select()
		.from(students)
		.where(eq(students.id, studentId))
		.limit(1);

	if (!student) throw error(404, 'Student not found');

	// 2. Fetch Session
	const [session] = await db
		.select()
		.from(labSessions)
		.where(and(eq(labSessions.id, sessionId), eq(labSessions.studentId, studentId)))
		.limit(1);

	if (!session) throw error(404, 'Session not found');

	// 3. Fetch App
	const [app] = await db
		.select()
		.from(sessionApps)
		.where(and(eq(sessionApps.id, appId), eq(sessionApps.sessionId, sessionId)))
		.limit(1);

	if (!app) throw error(404, 'Application not found');

	// 4. Fetch Details for this app
	const details = await db
		.select()
		.from(sessionDetails)
		.where(eq(sessionDetails.appId, appId))
		.orderBy(sessionDetails.totalSeconds);

	// 5. Fetch Segments for the app (where detailId is null)
	const appSegments = await db
		.select()
		.from(activitySegments)
		.where(and(
			eq(activitySegments.sessionId, sessionId),
			eq(activitySegments.appId, appId),
			isNull(activitySegments.detailId)
		))
		.orderBy(asc(activitySegments.startedAt));

	// 6. Fetch all segments for this app (including details) to categorize them
	const allSegments = await db
		.select()
		.from(activitySegments)
		.where(and(
			eq(activitySegments.sessionId, sessionId),
			eq(activitySegments.appId, appId)
		))
		.orderBy(asc(activitySegments.startedAt));

	return {
		student,
		session,
		app,
		details,
		segments: allSegments
	};
};
