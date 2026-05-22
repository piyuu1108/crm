import postgres from "postgres";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join("=").trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key && value && !process.env[key]) process.env[key] = value;
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const sql = postgres(DATABASE_URL, { max: 1 });

async function run() {
  const hashedPassword = await bcrypt.hash("password123", 10);
  await sql`UPDATE students SET password_hash = ${hashedPassword} WHERE email = 'dev.kapoor88@example.com'`;
  console.log("Updated dev.kapoor88@example.com password to password123");
  await sql.end();
}

run().catch((err) => {
  console.error("Reset failed:", err);
});
