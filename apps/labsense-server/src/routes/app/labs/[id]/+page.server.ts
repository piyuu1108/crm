import { db } from '$lib/server/db';
import { machines, labSessions, students, masterUsers } from '$lib/server/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { verifyPassword } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const machineId = params.id;
	const fromDate = url.searchParams.get('from');
	const toDate = url.searchParams.get('to');

	const [machine] = await db
		.select()
		.from(machines)
		.where(eq(machines.id, machineId))
		.limit(1);

	if (!machine) {
		throw error(404, 'Machine not found');
	}

	// Calculate aggregate stats for this machine
	const [stats] = await db
		.select({
			totalSessions: sql<number>`count(*)`,
			totalSeconds: sql<number>`sum(${labSessions.totalSeconds})`,
			activeSeconds: sql<number>`sum(${labSessions.activeSeconds})`,
			idleSeconds: sql<number>`sum(${labSessions.idleSeconds})`
		})
		.from(labSessions)
		.where(eq(labSessions.machineId, machineId));

	// Fetch sessions with student info
	const filters = [eq(labSessions.machineId, machineId)];
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
			studentName: students.name,
			studentId: students.id
		})
		.from(labSessions)
		.leftJoin(students, eq(labSessions.studentId, students.id))
		.where(and(...filters))
		.orderBy(desc(labSessions.loginAt));

	return {
		machine,
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
	editMachine: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const pcName = formData.get('pcName') as string;
		const labName = formData.get('labName') as string;
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

		const updateData: any = {};
		if (pcName) updateData.pcName = pcName;
		if (labName) updateData.labName = labName;

		if (Object.keys(updateData).length > 0) {
			await db.update(machines).set(updateData).where(eq(machines.id, params.id));
		}

		return { success: true, message: 'Machine updated successfully' };
	},

	deleteMachine: async ({ request, params, locals }) => {
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

		// Delete sessions first
		await db.delete(labSessions).where(eq(labSessions.machineId, params.id));
		await db.delete(machines).where(eq(machines.id, params.id));

		throw redirect(303, '/app/labs');
	}
};
