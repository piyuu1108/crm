import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "dotenv/config";
import fs from "fs";
import path from "path";

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
  }
  console.log("Running migration SQL...");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  
  const sqlContent = fs.readFileSync(path.join(process.cwd(), "drizzle", "0003_brave_black_tom.sql"), "utf-8");
  const statements = sqlContent.split("--> statement-breakpoint");
  
  for (const stmt of statements) {
    const query = stmt.trim();
    if (query) {
      console.log("Executing:", query.substring(0, 50) + "...");
      await sql.unsafe(query);
    }
  }

  console.log("Timetables table created!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed");
  console.error(err);
  process.exit(1);
});
