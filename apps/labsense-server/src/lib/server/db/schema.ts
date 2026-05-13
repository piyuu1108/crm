import { pgTable, serial, integer, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

// ── Admin Auth ──────────────────────────────────────────────

export const masterUsers = pgTable('master_users', {
	id: uuid('id').defaultRandom().primaryKey(),
	username: text('username').notNull().unique(),
	password: text('password').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => masterUsers.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// ── LabSense Domain ─────────────────────────────────────────

export const students = pgTable('students', {
	id: text('id').primaryKey(), // college ID
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
});

export const machines = pgTable('machines', {
	id: uuid('id').defaultRandom().primaryKey(),
	hardwareId: text('hardware_id').notNull().unique(),
	pcName: text('pc_name').notNull(),
	labName: text('lab_name'),
	lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
});

export const labSessions = pgTable('lab_sessions', {
	id: uuid('id').defaultRandom().primaryKey(),
	studentId: text('student_id')
		.notNull()
		.references(() => students.id),
	machineId: uuid('machine_id')
		.notNull()
		.references(() => machines.id),
	loginAt: timestamp('login_at', { withTimezone: true, mode: 'date' }).notNull(),
	logoutAt: timestamp('logout_at', { withTimezone: true, mode: 'date' }),
	lastSyncAt: timestamp('last_sync_at', { withTimezone: true, mode: 'date' }).notNull(),
	totalSeconds: integer('total_seconds').notNull().default(0),
	activeSeconds: integer('active_seconds').notNull().default(0),
	idleSeconds: integer('idle_seconds').notNull().default(0),
	status: text('status').notNull(), // active | ended | timeout
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
});

export const sessionApps = pgTable('session_apps', {
	id: uuid('id').defaultRandom().primaryKey(),
	sessionId: uuid('session_id')
		.notNull()
		.references(() => labSessions.id),
	appName: text('app_name').notNull(),
	totalSeconds: integer('total_seconds').notNull().default(0),
	activeSeconds: integer('active_seconds').notNull().default(0),
	idleSeconds: integer('idle_seconds').notNull().default(0),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
});
