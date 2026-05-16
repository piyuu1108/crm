import {
	pgTable,
	pgEnum,
	integer,
	text,
	timestamp,
	uuid,
	boolean,
	unique,
	index
} from 'drizzle-orm/pg-core';

// ── Enums ───────────────────────────────────────────────────

export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed']);
export const endReasonEnum = pgEnum('end_reason', ['logout', 'timeout']);

// ── Admin Auth ──────────────────────────────────────────────

export const masterUsers = pgTable('master_users', {
	id: uuid('id').defaultRandom().primaryKey(),
	username: text('username').notNull().unique(),
	password: text('password').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const adminSessions = pgTable('sessions', {
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
	refId: text('ref_id'),
	passwordHash: text('password_hash').notNull(),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
});

export const machines = pgTable('machines', {
	id: uuid('id').defaultRandom().primaryKey(),
	hardwareId: text('hardware_id').notNull().unique(),
	pcName: text('pc_name').notNull().unique(),
	labName: text('lab_name'),
	lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
});

export const labSessions = pgTable(
	'lab_sessions',
	{
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
		status: sessionStatusEnum('status').notNull().default('active'),
		endReason: endReasonEnum('end_reason'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
	},
	(t) => [
		index('idx_lab_sessions_student_id').on(t.studentId),
		index('idx_lab_sessions_machine_id').on(t.machineId),
		index('idx_lab_sessions_status').on(t.status)
	]
);

export const sessionApps = pgTable(
	'session_apps',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => labSessions.id),
		appName: text('app_name').notNull(),
		totalSeconds: integer('total_seconds').notNull().default(0),
		activeSeconds: integer('active_seconds').notNull().default(0),
		idleSeconds: integer('idle_seconds').notNull().default(0),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
	},
	(t) => [unique('uq_session_app').on(t.sessionId, t.appName)]
);

export const sessionDetails = pgTable(
	'session_details',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		appId: uuid('app_id')
			.notNull()
			.references(() => sessionApps.id, { onDelete: 'cascade' }),
		title: text('title'),
		url: text('url'),
		domain: text('domain'),
		totalSeconds: integer('total_seconds').notNull().default(0),
		activeSeconds: integer('active_seconds').notNull().default(0),
		idleSeconds: integer('idle_seconds').notNull().default(0),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
	},
	(t) => [unique('uq_session_detail').on(t.appId, t.title, t.url)]
);

export const activitySegments = pgTable(
	'activity_segments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => labSessions.id, { onDelete: 'cascade' }),
		appId: uuid('app_id')
			.references(() => sessionApps.id, { onDelete: 'cascade' }),
		detailId: uuid('detail_id')
			.references(() => sessionDetails.id, { onDelete: 'cascade' }),
		startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
	},
	(t) => [
		index('idx_segments_session').on(t.sessionId),
		index('idx_segments_app').on(t.appId),
		index('idx_segments_detail').on(t.detailId),
		unique('uq_activity_segment').on(t.sessionId, t.startedAt, t.endedAt, t.appId, t.detailId)
	]
);

// ── System Settings ─────────────────────────────────────────

export const systemSettings = pgTable('system_settings', {
	id: integer('id').primaryKey(),
	syncIntervalSeconds: integer('sync_interval_seconds').notNull().default(30),
	syncJitterSeconds: integer('sync_jitter_seconds').notNull().default(30),
	timeoutSeconds: integer('timeout_seconds').notNull().default(120),
	idleThresholdSeconds: integer('idle_threshold_seconds').notNull().default(120),
	enableDetails: boolean('enable_details').notNull().default(true),
	enableSegments: boolean('enable_segments').notNull().default(true),
	maxSegmentsPerApp: integer('max_segments_per_app').notNull().default(50),
	maxSegmentsPerDetail: integer('max_segments_per_detail').notNull().default(20),
	minimumTrackedSeconds: integer('minimum_tracked_seconds').notNull().default(15),
	candidateRetentionMinutes: integer('candidate_retention_minutes').notNull().default(10),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
});
