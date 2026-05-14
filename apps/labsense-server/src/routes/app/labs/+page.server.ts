import { db } from '$lib/server/db';
import { machines, labSessions, students } from '$lib/server/db/schema';
import { eq, desc, sql, and, ilike, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import type { LabMachine } from '$lib/types/labs';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const lab = url.searchParams.get('lab') || '';

	const latestSessionsSubquery = db
		.selectDistinctOn([labSessions.machineId])
		.from(labSessions)
		.orderBy(labSessions.machineId, desc(labSessions.loginAt))
		.as('latest_sessions');

	const filters = [];
	if (search) {
		filters.push(or(ilike(machines.pcName, `%${search}%`), ilike(machines.hardwareId, `%${search}%`)));
	}
	if (lab) {
		filters.push(eq(machines.labName, lab));
	}

	const rawMachinesData = await db
		.select({
			id: machines.id,
			hardwareId: machines.hardwareId,
			pcName: machines.pcName,
			labName: machines.labName,
			lastSeenAt: machines.lastSeenAt,
			sessionId: latestSessionsSubquery.id,
			sessionStatus: latestSessionsSubquery.status,
			sessionLoginAt: latestSessionsSubquery.loginAt,
			studentId: students.id,
			studentName: students.name
		})
		.from(machines)
		.leftJoin(latestSessionsSubquery, eq(machines.id, latestSessionsSubquery.machineId))
		.leftJoin(students, eq(latestSessionsSubquery.studentId, students.id))
		.where(filters.length > 0 ? and(...filters) : undefined)
		.orderBy(machines.pcName);

	const machinesData: LabMachine[] = rawMachinesData.map((row) => ({
		id: row.id,
		pcName: row.pcName,
		hardwareId: row.hardwareId,
		labName: row.labName,
		lastSeenAt: row.lastSeenAt,
		latestSession: row.sessionId
			? {
					id: row.sessionId,
					status: row.sessionStatus!,
					loginAt: row.sessionLoginAt!,
					student: row.studentId
						? {
								id: row.studentId,
								name: row.studentName!
							}
						: null
				}
			: null
	}));

	// Get all unique lab names for the filter
	const labsList = await db
		.select({ name: machines.labName })
		.from(machines)
		.groupBy(machines.labName)
		.where(sql`${machines.labName} IS NOT NULL`);

	return {
		machines: machinesData,
		labs: labsList.map((l) => l.name as string),
		search,
		lab
	};
};
