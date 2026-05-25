import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../app/lib/schema";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";

// Load .env manually to ensure DATABASE_URL is available
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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const queryClient = postgres(process.env.DATABASE_URL);
const db = drizzle({ client: queryClient, schema });

async function seed() {
  console.log("Seeding administrative roles and accounts...");

  // 1. Seed Roles
  const rolesToInsert = ["principal", "vice_principal"];
  for (const roleName of rolesToInsert) {
    const existing = await db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, roleName));
    
    if (existing.length === 0) {
      await db.insert(schema.roles).values({ name: roleName });
      console.log(`Role '${roleName}' created.`);
    } else {
      console.log(`Role '${roleName}' already exists.`);
    }
  }

  // 2. Seed Principal Account
  const principalEmail = "principal@college.edu";
  const principalPassword = "pass@123";
  const principalCode = "PRIN001";
  const principalName = "System Principal";

  const existingPrincipal = await db
    .select()
    .from(schema.administrators)
    .where(eq(schema.administrators.email, principalEmail));

  if (existingPrincipal.length === 0) {
    const hashedPassword = await bcrypt.hash(principalPassword, 10);
    await db.insert(schema.administrators).values({
      adminCode: principalCode,
      name: principalName,
      email: principalEmail,
      mobile: "9999999901",
      passwordHash: hashedPassword,
      mustChangePwd: false,
      designation: "principal",
      isActive: true,
    });
    console.log(`Principal account created (Email: ${principalEmail}, Password: ${principalPassword})`);
  } else {
    console.log(`Principal account '${principalEmail}' already exists.`);
  }

  // 3. Seed Vice Principal Account
  const vpEmail = "vp@college.edu";
  const vpPassword = "pass@123";
  const vpCode = "VP001";
  const vpName = "System Vice Principal";

  const existingVP = await db
    .select()
    .from(schema.administrators)
    .where(eq(schema.administrators.email, vpEmail));

  if (existingVP.length === 0) {
    const hashedPassword = await bcrypt.hash(vpPassword, 10);
    await db.insert(schema.administrators).values({
      adminCode: vpCode,
      name: vpName,
      email: vpEmail,
      mobile: "9999999902",
      passwordHash: hashedPassword,
      mustChangePwd: false,
      designation: "vice_principal",
      isActive: true,
    });
    console.log(`Vice Principal account created (Email: ${vpEmail}, Password: ${vpPassword})`);
  } else {
    console.log(`Vice Principal account '${vpEmail}' already exists.`);
  }

  console.log("Seeding complete!");
  await queryClient.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
