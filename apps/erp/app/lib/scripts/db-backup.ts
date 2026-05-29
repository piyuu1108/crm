import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ─── LOAD ENV CONFIGURATION ──────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ Error: DATABASE_URL is not defined in .env file.");
  process.exit(1);
}

// Ensure backups directory exists
const backupsDir = path.resolve(process.cwd(), "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFilePath = path.join(backupsDir, `db_backup_${timestamp}.sql`);

async function run() {
  console.log("⚡ Starting database backup process...");
  console.log(`📂 Output file: ${backupFilePath}`);

  // ─── Try pg_dump first ─────────────────────────────────────────────────────
  try {
    console.log("🔍 Attempting to run native pg_dump...");
    // Pass connection string directly using --dbname
    execSync(`pg_dump --dbname="${dbUrl}" --clean --if-exists -f "${backupFilePath}"`, {
      stdio: "ignore",
    });
    console.log("✅ Backup completed successfully using pg_dump!");
    return;
  } catch (err) {
    console.warn("⚠️ Native pg_dump is not available or failed. Falling back to programmatic Node.js backup...");
  }

  // ─── Programmatic Fallback ─────────────────────────────────────────────────
  const postgres = (await import("postgres")).default;
  const sql = postgres(dbUrl, { max: 1 });

  try {
    const backupLines: string[] = [];
    backupLines.push(`-- ========================================================`);
    backupLines.push(`-- Database Backup Generated Programmatically`);
    backupLines.push(`-- Date: ${new Date().toISOString()}`);
    backupLines.push(`-- ========================================================`);
    backupLines.push(``);
    backupLines.push(`BEGIN;`);
    backupLines.push(`SET statement_timeout = 0;`);
    backupLines.push(`SET client_encoding = 'UTF8';`);
    backupLines.push(`SET standard_conforming_strings = on;`);
    backupLines.push(`SET check_function_bodies = false;`);
    backupLines.push(`SET xmloption = content;`);
    backupLines.push(`SET client_min_messages = warning;`);
    backupLines.push(`SET row_security = off;`);
    backupLines.push(``);

    // Fetch all user tables in public schema
    console.log("📋 Fetching tables list from public schema...");
    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_drizzle_migrations'
      ORDER BY table_name;
    `;

    if (tables.length === 0) {
      console.log("ℹ️ No tables found to backup.");
      backupLines.push(`-- No tables found.`);
      backupLines.push(`COMMIT;`);
      fs.writeFileSync(backupFilePath, backupLines.join("\n"));
      console.log("✅ Empty backup file written.");
      await sql.end();
      return;
    }

    console.log(`📦 Found ${tables.length} tables to dump.`);

    // Temporary disable triggers to avoid FK/Constraint issues during restoration
    backupLines.push(`-- Disable triggers/foreign key checks for all tables`);
    for (const t of tables) {
      backupLines.push(`ALTER TABLE ONLY public."${t.table_name}" DISABLE TRIGGER ALL;`);
    }
    backupLines.push(``);

    for (const t of tables) {
      const tableName = t.table_name;
      console.log(`📤 Dumping table: ${tableName}...`);

      // Fetch column metadata to handle quotes and data types properly
      const columns = await sql<{ column_name: string; data_type: string }[]>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;

      const colNames = columns.map((c) => `"${c.column_name}"`).join(", ");

      // Fetch all records for the table
      const rows = await sql.unsafe(`SELECT * FROM public."${tableName}"`);

      backupLines.push(`-- Data for table public."${tableName}" (rows: ${rows.length})`);
      backupLines.push(`TRUNCATE TABLE public."${tableName}" CASCADE;`);

      if (rows.length > 0) {
        for (const row of rows) {
          const values: string[] = [];
          for (const col of columns) {
            const rawVal = row[col.column_name];

            if (rawVal === null || rawVal === undefined) {
              values.push("NULL");
            } else if (typeof rawVal === "boolean") {
              values.push(rawVal ? "true" : "false");
            } else if (typeof rawVal === "number") {
              values.push(String(rawVal));
            } else if (rawVal instanceof Date) {
              values.push(`'${rawVal.toISOString()}'`);
            } else if (typeof rawVal === "object") {
              // Convert object/array/json to string and escape
              const escapedJson = String(JSON.stringify(rawVal)).replace(/'/g, "''");
              values.push(`'${escapedJson}'::jsonb`);
            } else {
              // Standard string escape
              const escapedStr = String(rawVal).replace(/'/g, "''");
              values.push(`'${escapedStr}'`);
            }
          }
          backupLines.push(`INSERT INTO public."${tableName}" (${colNames}) VALUES (${values.join(", ")});`);
        }
      }
      backupLines.push(``);
    }

    // Re-enable triggers
    backupLines.push(`-- Re-enable triggers/foreign key checks for all tables`);
    for (const t of tables) {
      backupLines.push(`ALTER TABLE ONLY public."${t.table_name}" ENABLE TRIGGER ALL;`);
    }
    backupLines.push(``);
    backupLines.push(`COMMIT;`);

    fs.writeFileSync(backupFilePath, backupLines.join("\n"));
    console.log(`\n🎉 Programmatic backup completed successfully!`);
    console.log(`📁 File size: ${(fs.statSync(backupFilePath).size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error("❌ Programmatic backup failed:", error);
  } finally {
    await sql.end();
  }
}

run().catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
