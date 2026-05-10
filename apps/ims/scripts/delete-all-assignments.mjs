import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
});

try {
  const res = await sql`
    DELETE FROM assignments
    RETURNING id;
  `;
  console.log(`Deleted ${res.length} assignments.`);

  await sql.end();
  console.log("Done.");
} catch (e) {
  console.error("Deletion failed:", e.message);
  await sql.end();
  process.exit(1);
}
