import { db } from '$lib/server/db';
import { students, labSessions, machines } from '$lib/server/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { verifyPassword, hashPassword } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const studentId = params.id;
	const fromDate = url.searchParams.get('from');
	const toDate = url.searchParams.get('to');

	const [student] = await db
		.select()
		.from(students)
		.where(eq(students.id, studentId))
		.limit(1);

	if (!student) {
		throw error(404, 'Student not found');
	}

	// Calculate aggregate stats
	const [stats] = await db
		.select({
			totalSessions: sql<number>`count(*)`,
			totalSeconds: sql<number>`sum(${labSessions.totalSeconds})`,
			activeSeconds: sql<number>`sum(${labSessions.activeSeconds})`,
			idleSeconds: sql<number>`sum(${labSessions.idleSeconds})`
		})
		.from(labSessions)
		.where(eq(labSessions.studentId, studentId));

	// Fetch sessions with machine info
	const filters = [eq(labSessions.studentId, studentId)];
	if (fromDate) filters.push(gte(labSessions.loginAt, new Date(fromDate)));
	if (toDate) {
		const endOfDay = new Date(toDate);
		endOfDay.setHours(23, 59, 59, 999);
		filters.push(lte(labSessions.loginAt, endOfDay));
	}

	const sessions = await db
		.select({
			id: labSessions.id,
			loginAt: labSessions.loginAt,
			logoutAt: labSessions.logoutAt,
			totalSeconds: labSessions.totalSeconds,
			activeSeconds: labSessions.activeSeconds,
			status: labSessions.status,
			machineName: machines.pcName
		})
		.from(labSessions)
		.leftJoin(machines, eq(labSessions.machineId, machines.id))
		.where(and(...filters))
		.orderBy(desc(labSessions.loginAt));

	return {
		student,
		stats: {
			totalSessions: Number(stats?.totalSessions || 0),
			totalSeconds: Number(stats?.totalSeconds || 0),
			activeSeconds: Number(stats?.activeSeconds || 0),
			idleSeconds: Number(stats?.idleSeconds || 0)
		},
		sessions,
		from: fromDate,
		to: toDate
	};
};

export const actions: Actions = {
	editStudent: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const password = formData.get('password') as string;
		const adminPassword = formData.get('adminPassword') as string;

		if (!adminPassword) {
			return fail(400, { message: 'Admin password required for verification' });
		}

		// Verify admin password
		const admin = locals.user;
		if (!admin) return fail(401, { message: 'Unauthorized' });

		const isValid = await verifyPassword(admin.password, adminPassword);
		if (!isValid) {
			return fail(401, { message: 'Incorrect admin password' });
		}

		const updateData: any = {};
		if (name) updateData.name = name;
		if (password) updateData.passwordHash = await hashPassword(password);

		if (Object.keys(updateData).length > 0) {
			await db.update(students).set(updateData).where(eq(students.id, params.id));
		}

		return { success: true, message: 'Student updated successfully' };
	},

	deleteStudent: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const adminPassword = formData.get('adminPassword') as string;

		if (!adminPassword) {
			return fail(400, { message: 'Admin password required for verification' });
		}

		const admin = locals.user;
		if (!admin) return fail(401, { message: 'Unauthorized' });

		const isValid = await verifyPassword(admin.password, adminPassword);
		if (!isValid) {
			return fail(401, { message: 'Incorrect admin password' });
		}

		// Cascade chain: labSessions → sessionApps → sessionDetails → activitySegments
		await db.delete(labSessions).where(eq(labSessions.studentId, params.id));
		await db.delete(students).where(eq(students.id, params.id));

		throw redirect(303, '/app/students');
	}
};
