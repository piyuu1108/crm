import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const collegeId = formData.get('collegeId')?.toString()?.trim()?.toUpperCase();
		const name = formData.get('name')?.toString()?.trim();
		const password = formData.get('password')?.toString();

		console.log(`[student-add] Attempting to create student: ${collegeId}`);

		if (!collegeId || !name || !password) {
			console.log(`[student-add] Validation failed: missing fields`);
			return fail(400, {
				message: 'All fields are required.',
				collegeId: collegeId || '',
				name: name || ''
			});
		}

		try {
			// Check uniqueness
			const [existing] = await db.select({ id: students.id }).from(students).where(eq(students.id, collegeId));

			if (existing) {
				console.log(`[student-add] Duplicate collegeId: ${collegeId}`);
				return fail(400, {
					message: `Student with ID "${collegeId}" already exists.`,
					collegeId,
					name
				});
			}

			const passwordHash = await hashPassword(password);

			await db.insert(students).values({
				id: collegeId,
				name,
				passwordHash
			});

			console.log(`[student-add] Successfully created student: ${collegeId}`);
			throw redirect(303, '/app/students');
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err; // Re-throw SvelteKit redirect
			}
			console.error('[student-add] CRITICAL ERROR:', err);
			return fail(500, { message: 'An unexpected error occurred.' });
		}
	}
};
