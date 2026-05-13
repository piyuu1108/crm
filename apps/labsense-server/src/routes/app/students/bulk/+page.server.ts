import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';
import { parseCsv } from '$lib/utils/csv';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	preview: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file || file.size === 0) {
			return fail(400, { step: 'upload' as const, error: 'Please upload a CSV file.' });
		}

		const content = await file.text();
		const { valid, invalid } = parseCsv(content);

		if (valid.length === 0 && invalid.length === 0) {
			return fail(400, { step: 'upload' as const, error: 'CSV file is empty.' });
		}

		if (valid.length === 0) {
			return fail(400, { step: 'upload' as const, error: 'No valid rows found in CSV.', invalid });
		}

		// Check for duplicates within the CSV
		const csvIds = valid.map((r) => r.collegeId);
		const csvDuplicateIds = csvIds.filter((id, idx) => csvIds.indexOf(id) !== idx);

		// Check for existing students in DB
		const existingStudents = csvIds.length > 0
			? await db
					.select({ id: students.id })
					.from(students)
					.where(inArray(students.id, csvIds))
			: [];
		const existingIds = new Set(existingStudents.map((s) => s.id));
		const csvDuplicateSet = new Set(csvDuplicateIds);

		const preview = valid.map((row) => {
			let status: 'new' | 'duplicate' | 'csv_duplicate' = 'new';
			if (existingIds.has(row.collegeId)) {
				status = 'duplicate';
			} else if (csvDuplicateSet.has(row.collegeId)) {
				status = 'csv_duplicate';
			}
			return { ...row, status };
		});

		const newCount = preview.filter((r) => r.status === 'new').length;
		const dupCount = preview.filter((r) => r.status === 'duplicate').length;
		const csvDupCount = preview.filter((r) => r.status === 'csv_duplicate').length;

		return {
			step: 'preview' as const,
			preview,
			invalid,
			counts: { new: newCount, duplicate: dupCount, csvDuplicate: csvDupCount, invalid: invalid.length }
		};
	},

	import: async ({ request }) => {
		const formData = await request.formData();
		const rowsJson = formData.get('rows')?.toString();

		if (!rowsJson) {
			return fail(400, { step: 'upload' as const, error: 'No data to import.' });
		}

		const rows: { collegeId: string; name: string; password: string }[] = JSON.parse(rowsJson);

		if (rows.length === 0) {
			return fail(400, { step: 'upload' as const, error: 'No valid rows to import.' });
		}

		// Double-check for existing
		const existingStudents = await db
			.select({ id: students.id })
			.from(students)
			.where(inArray(students.id, rows.map((r) => r.collegeId)));
		const existingIds = new Set(existingStudents.map((s) => s.id));

		const toInsert = rows.filter((r) => !existingIds.has(r.collegeId));

		// Deduplicate by collegeId (keep first occurrence)
		const seen = new Set<string>();
		const unique = toInsert.filter((r) => {
			if (seen.has(r.collegeId)) return false;
			seen.add(r.collegeId);
			return true;
		});

		let imported = 0;
		for (const row of unique) {
			const passwordHash = await hashPassword(row.password);
			await db.insert(students).values({
				id: row.collegeId,
				name: row.name,
				passwordHash
			});
			imported++;
		}

		return {
			step: 'done' as const,
			summary: {
				imported,
				skipped: rows.length - imported
			}
		};
	}
};
