import 'dotenv/config';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const sql = postgres(databaseUrl);

async function migrate() {
	console.log('Running LabSense agent schema migration...\n');

	try {
		// 1. Drop leftover task table
		console.log('1. Dropping leftover task table...');
		await sql`DROP TABLE IF EXISTS task CASCADE`;
		console.log('   Done.\n');

		// 2. Create enums (idempotent with IF NOT EXISTS)
		console.log('2. Creating enums...');
		await sql`DO $$ BEGIN
			CREATE TYPE session_status AS ENUM ('active', 'completed');
		EXCEPTION
			WHEN duplicate_object THEN NULL;
		END $$`;
		await sql`DO $$ BEGIN
			CREATE TYPE end_reason AS ENUM ('logout', 'timeout');
		EXCEPTION
			WHEN duplicate_object THEN NULL;
		END $$`;
		console.log('   Created session_status and end_reason enums.\n');

		// 3. Add ref_id column to students if not exists
		console.log('3. Adding ref_id column to students...');
		await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS ref_id TEXT`;
		console.log('   Done.\n');

		// 4. Migrate lab_sessions.status from text to enum + add end_reason
		console.log('4. Migrating lab_sessions status column and adding end_reason...');

		// Check if status is already the enum type
		const [statusCol] = await sql`
			SELECT data_type, udt_name FROM information_schema.columns
			WHERE table_name = 'lab_sessions' AND column_name = 'status'
		`;

		if (statusCol && statusCol.udt_name !== 'session_status') {
			// Convert existing status values: 'ended' -> 'completed', 'timeout' -> 'completed'
			await sql`UPDATE lab_sessions SET status = 'completed' WHERE status IN ('ended', 'timeout')`;

			// Drop default if any, change type
			await sql`ALTER TABLE lab_sessions
				ALTER COLUMN status DROP DEFAULT,
				ALTER COLUMN status TYPE session_status USING status::session_status,
				ALTER COLUMN status SET DEFAULT 'active'
			`;
			console.log('   Converted status column from TEXT to session_status enum.');
		} else {
			console.log('   Status column already using enum (skipped).');
		}

		// Add end_reason column
		await sql`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS end_reason end_reason`;
		console.log('   Added end_reason column.\n');

		// Backfill end_reason for existing completed sessions that had 'timeout' status
		// (we converted them above, but we can set end_reason based on logout_at)
		await sql`UPDATE lab_sessions
			SET end_reason = CASE
				WHEN logout_at IS NOT NULL THEN 'logout'::end_reason
				ELSE 'timeout'::end_reason
			END
			WHERE status = 'completed' AND end_reason IS NULL`;

		// 5. Add indexes on lab_sessions
		console.log('5. Adding indexes on lab_sessions...');
		await sql`CREATE INDEX IF NOT EXISTS idx_lab_sessions_student_id ON lab_sessions (student_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_lab_sessions_machine_id ON lab_sessions (machine_id)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_lab_sessions_status ON lab_sessions (status)`;
		console.log('   Done.\n');

		// 6. Add unique constraint on session_apps (session_id, app_name)
		console.log('6. Adding unique constraint on session_apps...');
		await sql`DO $$ BEGIN
			ALTER TABLE session_apps ADD CONSTRAINT uq_session_app UNIQUE (session_id, app_name);
		EXCEPTION
			WHEN duplicate_object THEN NULL;
		END $$`;
		console.log('   Done.\n');

		// 7. Create system_settings table
		console.log('7. Creating system_settings table...');
		await sql`CREATE TABLE IF NOT EXISTS system_settings (
			id INTEGER PRIMARY KEY,
			sync_interval_seconds INTEGER NOT NULL DEFAULT 30,
			sync_jitter_seconds INTEGER NOT NULL DEFAULT 30,
			timeout_seconds INTEGER NOT NULL DEFAULT 120,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`;
		console.log('   Done.\n');

		// 8. Seed default system settings
		console.log('8. Seeding default system settings...');
		await sql`INSERT INTO system_settings (id, sync_interval_seconds, sync_jitter_seconds, timeout_seconds)
			VALUES (1, 30, 30, 120)
			ON CONFLICT (id) DO NOTHING`;
		console.log('   Done.\n');

		console.log('✓ Migration completed successfully!');
	} catch (error) {
		console.error('✗ Migration failed:', error);
		process.exit(1);
	} finally {
		await sql.end();
		process.exit(0);
	}
}

migrate();
