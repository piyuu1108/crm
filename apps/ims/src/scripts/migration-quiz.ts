import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in environment variables!");
  process.exit(1);
}

async function migrate() {
  console.log("⏳ Connecting to database...");
  const sql = postgres(connectionString!, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("⏳ Applying schema changes to 'timetables' table...");

    // 1. Drop NOT NULL constraint on assignment_id
    console.log("- Dropping NOT NULL on assignment_id...");
    await sql`ALTER TABLE timetables ALTER COLUMN assignment_id DROP NOT NULL;`;

    // 2. Drop NOT NULL constraint on subject_id
    console.log("- Dropping NOT NULL on subject_id...");
    await sql`ALTER TABLE timetables ALTER COLUMN subject_id DROP NOT NULL;`;

    // 3. Drop NOT NULL constraint on faculty_id
    console.log("- Dropping NOT NULL on faculty_id...");
    await sql`ALTER TABLE timetables ALTER COLUMN faculty_id DROP NOT NULL;`;

    // 4. Add is_quiz boolean column if not exists
    console.log("- Adding is_quiz column...");
    await sql`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS is_quiz BOOLEAN NOT NULL DEFAULT FALSE;`;

    console.log("✅ Database schema successfully synchronized!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await sql.end();
  }
}

migrate();
