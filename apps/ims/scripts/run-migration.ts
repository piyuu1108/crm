import { sql } from "drizzle-orm";
import { db } from "../src/db/index";
import * as fs from "fs";

async function main() {
  try {
    const sqlContent = fs.readFileSync("drizzle/0002_careful_toro.sql", "utf8");
    await db.execute(sql.raw(sqlContent));
    console.log("Migration applied successfully");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}
main();
