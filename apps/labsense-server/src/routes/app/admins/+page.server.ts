import { db } from '$lib/server/db';
import { masterUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const admins = await db
		.select({
			id: masterUsers.id,
			username: masterUsers.username,
			createdAt: masterUsers.createdAt
		})
		.from(masterUsers)
		.orderBy(masterUsers.username);

	return {
		admins
	};
};

export const actions: Actions = {
	changePassword: async ({ request }) => {
		const formData = await request.formData();
		const adminId = formData.get('adminId') as string;
		const oldPassword = formData.get('oldPassword') as string;
		const newPassword = formData.get('newPassword') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!adminId || !oldPassword || !newPassword || !confirmPassword) {
			return fail(400, { message: 'All fields are required' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'New passwords do not match' });
		}

		// Fetch the admin to verify the old password
		const [admin] = await db
			.select()
			.from(masterUsers)
			.where(eq(masterUsers.id, adminId))
			.limit(1);

		if (!admin) {
			return fail(404, { message: 'Admin not found' });
		}

		// Verify old password
		const isValid = await verifyPassword(admin.password, oldPassword);
		if (!isValid) {
			return fail(401, { message: 'Invalid old password' });
		}

		// Hash and update new password
		const hashedPassword = await hashPassword(newPassword);
		await db
			.update(masterUsers)
			.set({
				password: hashedPassword,
				updatedAt: new Date()
			})
			.where(eq(masterUsers.id, adminId));

		return { success: true, message: 'Password updated successfully' };
	},
	createAdmin: async ({ request }) => {
		const formData = await request.formData();
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		if (!username || !password) {
			return fail(400, { message: 'Username and password are required' });
		}

		// Check if username already exists
		const [existing] = await db
			.select()
			.from(masterUsers)
			.where(eq(masterUsers.username, username))
			.limit(1);

		if (existing) {
			return fail(400, { message: 'Username already taken' });
		}

		// Hash password and insert
		const hashedPassword = await hashPassword(password);
		await db.insert(masterUsers).values({
			username,
			password: hashedPassword
		});

		return { success: true, message: 'Admin created successfully' };
	}
};
