import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
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
      const key = parts[0];
      let value = parts.slice(1).join("=").trim();
      // Strip surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key && value && !process.env[key]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding database...");

  // 1. Seed Roles
  const rolesToInsert = ["student", "faculty", "counselor", "hod"];
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

  // Fetch roles to get their IDs
  const allRoles = await db.select().from(schema.roles);
  const hodRole = allRoles.find((r) => r.name === "hod");
  const facultyRole = allRoles.find((r) => r.name === "faculty");
  const studentRole = allRoles.find((r) => r.name === "student");
  const counselorRole = allRoles.find((r) => r.name === "counselor");

  if (!hodRole || !facultyRole || !studentRole || !counselorRole) {
    throw new Error("Roles were not seeded correctly");
  }

  // 2. Seed HOD Account
  const hodEmail = "hod@college.edu";
  const hodPassword = "password123";
  const hodFacultyCode = "HOD001";
  const hodName = "System Admin HOD";

  const existingHod = await db
    .select()
    .from(schema.faculty)
    .where(eq(schema.faculty.email, hodEmail));

  let hodId: number;

  if (existingHod.length === 0) {
    const hashedPassword = await bcrypt.hash(hodPassword, 10);
    const [newHod] = await db.insert(schema.faculty).values({
      facultyCode: hodFacultyCode,
      name: hodName,
      email: hodEmail,
      mobile: "9999999999",
      passwordHash: hashedPassword,
      mustChangePwd: true,
      designation: "Head of Department",
      isActive: true,
    }).returning({ id: schema.faculty.id });
    
    hodId = newHod.id;
    console.log(`HOD account created (Email: ${hodEmail}, Password: ${hodPassword})`);
  } else {
    hodId = existingHod[0].id;
    console.log(`HOD account '${hodEmail}' already exists.`);
  }

  // 3. Assign Roles to HOD
  const rolesToAssign = [hodRole.id, facultyRole.id, studentRole.id, counselorRole.id];
  for (const rId of rolesToAssign) {
    const existingRoleMapping = await db
      .select()
      .from(schema.facultyRoles)
      .where(eq(schema.facultyRoles.facultyId, hodId))
      // Workaround: We have to manually filter in JS if multi-column where is tricky, 
      // but let's just use raw filtering or multiple eq clauses if needed.
      // Drizzle supports it: and(eq(a, b), eq(c, d))
      // But since we are iterating, we can just fetch all mappings for this user
      // and check in memory.
    
    const userRoles = await db
        .select()
        .from(schema.facultyRoles)
        .where(eq(schema.facultyRoles.facultyId, hodId));

    if (!userRoles.find(ur => ur.roleId === rId)) {
      await db.insert(schema.facultyRoles).values({
        facultyId: hodId,
        roleId: rId,
      });
      console.log(`Role mapping added for HOD (Role ID: ${rId})`);
    } else {
        console.log(`Role mapping already exists for HOD (Role ID: ${rId})`);
    }
  }

  // 4. Seed Faculty Users (Bulk)

const facultyUsers = [
  { name: "Priyanka Chauhan", email: "priyankachauhan@gmail.com", code: "FAC002" },
  { name: "Kajal Bhanushali", email: "kajalbhanushali@gmail.com", code: "FAC003" },
  { name: "Priya Sharma", email: "priyasharma@gmail.com", code: "FAC004" },
  { name: "Bhavin Rabbari", email: "bhavinrabbari@gmail.com", code: "FAC005" },
  { name: "Amit Patel", email: "amitpatel@gmail.com", code: "FAC006" },
  { name: "Hinal Rabbari", email: "hinalrabbari@gmail.com", code: "FAC007" },
  { name: "Sherya Patel", email: "sheryapatel@gmail.com", code: "FAC008" },
  { name: "Krishna Patel", email: "krishnapatel@gmail.com", code: "FAC009" },
  { name: "Nidhi Patel", email: "nidhipatel@gmail.com", code: "FAC010" },
  { name: "Rinkal Patel", email: "rinkalpatel@gmail.com", code: "FAC011" },
];

const defaultPassword = "pass@123";

for (const user of facultyUsers) {
  const existing = await db
    .select()
    .from(schema.faculty)
    .where(eq(schema.faculty.email, user.email));

  let facultyId: number;

  if (existing.length === 0) {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const [newFaculty] = await db.insert(schema.faculty).values({
      facultyCode: user.code,
      name: user.name,
      email: user.email,
      mobile: "9999999999",
      passwordHash: hashedPassword,
      mustChangePwd: true,
      designation: "Assistant Professor",
      isActive: true,
    }).returning({ id: schema.faculty.id });

    facultyId = newFaculty.id;

    console.log(`Created: ${user.email} / ${defaultPassword}`);
  } else {
    facultyId = existing[0].id;
    console.log(`Already exists: ${user.email}`);
  }

  // Assign FACULTY role
  const existingRoles = await db
    .select()
    .from(schema.facultyRoles)
    .where(eq(schema.facultyRoles.facultyId, facultyId));

  if (!existingRoles.find(r => r.roleId === facultyRole.id)) {
    await db.insert(schema.facultyRoles).values({
      facultyId: facultyId,
      roleId: facultyRole.id,
    });

    console.log(`Role assigned (faculty) → ${user.email}`);
  }
}
  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
