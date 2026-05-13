import { db } from '$lib/server/db';
import { students, labSessions } from '$lib/server/db/schema';
import { sql, eq, or, ilike, desc, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('q') || '';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const sortBy = url.searchParams.get('sort') || 'name';
	const sortDir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
	const perPage = 20;
	const offset = (page - 1) * perPage;

	// Build search condition
	const searchCondition = search
		? or(ilike(students.id, `%${search}%`), ilike(students.name, `%${search}%`))
		: undefined;

	// Count total matching students
	const [{ count: totalCount }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(students)
		.where(searchCondition);

	// Sort column mapping
	const sortMap: Record<string, ReturnType<typeof sql>> = {
		name: sql`${students.name}`,
		totalLab: sql`coalesce(sum(${labSessions.totalSeconds}), 0)`,
		totalActive: sql`coalesce(sum(${labSessions.activeSeconds}), 0)`,
		lastLogin: sql`max(${labSessions.loginAt})`
	};

	const orderExpr = sortMap[sortBy] || sql`${students.name}`;
	const orderDirection = sortDir === 'asc' ? asc(orderExpr) : desc(orderExpr);

	// Aggregated query with LEFT JOIN to labSessions
	const rows = await db
		.select({
			id: students.id,
			name: students.name,
			isActive: students.isActive,
			totalLabSeconds: sql<number>`coalesce(sum(${labSessions.totalSeconds}), 0)::int`,
			totalActiveSeconds: sql<number>`coalesce(sum(${labSessions.activeSeconds}), 0)::int`,
			totalIdleSeconds: sql<number>`coalesce(sum(${labSessions.idleSeconds}), 0)::int`,
			lastLogin: sql<Date | null>`max(${labSessions.loginAt})`
		})
		.from(students)
		.leftJoin(labSessions, eq(students.id, labSessions.studentId))
		.where(searchCondition)
		.groupBy(students.id, students.name, students.isActive)
		.orderBy(orderDirection)
		.limit(perPage)
		.offset(offset);

	return {
		students: rows,
		totalCount,
		page,
		perPage,
		search,
		sortBy,
		sortDir
	};
};
