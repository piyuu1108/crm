import { redirect } from '@sveltejs/kit';
import { invalidateSession, deleteSessionCookie } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { students, machines, labSessions } from '$lib/server/db/schema';
import { count, eq, sql, gte, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	const [totalStudentsResult] = await db.select({ value: count() }).from(students);
	const [activeSessionsResult] = await db
		.select({ value: count() })
		.from(labSessions)
		.where(eq(labSessions.status, 'active'));
	const [totalMachinesResult] = await db.select({ value: count() }).from(machines);

	// Total hours today (UTC based)
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const [totalSecondsToday] = await db
		.select({ value: sql<number>`sum(${labSessions.totalSeconds})` })
		.from(labSessions)
		.where(gte(labSessions.loginAt, today));

	const totalHoursToday = Math.round((Number(totalSecondsToday?.value || 0) / 3600) * 10) / 10;

	// Usage history (last 7 days)
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
	sevenDaysAgo.setHours(0, 0, 0, 0);

	const usageHistory = await db
		.select({
			date: sql<string>`DATE(${labSessions.loginAt})`,
			count: count()
		})
		.from(labSessions)
		.where(gte(labSessions.loginAt, sevenDaysAgo))
		.groupBy(sql`DATE(${labSessions.loginAt})`)
		.orderBy(sql`DATE(${labSessions.loginAt})`);

	// Recent sessions
	const recentSessions = await db
		.select({
			id: labSessions.id,
			studentName: students.name,
			studentId: students.id,
			pcName: machines.pcName,
			loginAt: labSessions.loginAt,
			status: labSessions.status
		})
		.from(labSessions)
		.innerJoin(students, eq(labSessions.studentId, students.id))
		.innerJoin(machines, eq(labSessions.machineId, machines.id))
		.orderBy(desc(labSessions.loginAt))
		.limit(5);

	return {
		stats: {
			totalStudents: totalStudentsResult.value,
			activeSessions: activeSessionsResult.value,
			totalMachines: totalMachinesResult.value,
			totalHoursToday
		},
		usageHistory,
		recentSessions
	};
};

export const actions: Actions = {
	logout: async ({ locals, cookies }) => {
		if (locals.session) {
			await invalidateSession(locals.session.id);
		}
		deleteSessionCookie(cookies);
		throw redirect(302, '/');
	}
};
