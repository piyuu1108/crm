import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
});

try {
  const res = await sql`
    DELETE FROM assignments a
    USING subjects s, classes c
    WHERE a.subject_id = s.id 
      AND a.class_id = c.id 
      AND s.semester != c.semester
    RETURNING a.id;
  `;
  console.log(`Deleted ${res.length} mismatched assignments (where subject.semester != class.semester).`);

  await sql.end();
  console.log("Done.");
} catch (e) {
  console.error("Deletion failed:", e.message);
  await sql.end();
  process.exit(1);
}
