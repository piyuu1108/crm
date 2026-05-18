import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { admins, settings } from "../db/schema";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;

async function seed() {
  console.log("🌱 Seeding database...");
  console.log("Connecting to:", connectionString.replace(/:[^:@]+@/, ":***@"));

  const client = postgres(connectionString, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
    connect_timeout: 30,
  });
  const db = drizzle(client);

  console.log("🧹 Truncating all tables (keeping schema)...");
  await db.execute(sql`
    DO $$ DECLARE
        r RECORD;
    BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE;';
        END LOOP;
    END $$;
  `);
  console.log("✅ All tables truncated.");

  const initialAdmins = [
    {
      name: "Snehal Mistry",
      email: "snehalmistry@manage.com",
      passwordRaw: "sneh@1234",
      role: "Principal" as const,
    },
    {
      name: "Payal Mahida",
      email: "payalmahida@manage.com",
      passwordRaw: "paya@1234",
      role: "VicePrincipal" as const,
    },
    {
      name: "Amit Patel",
      email: "amitpatel@gmail.com",
      passwordRaw: "hod#1122",
      role: "HOD" as const,
    },
    {
      name: "Viral Chauhan",
      email: "viralchauhan@manage.com",
      passwordRaw: "vira@1234",
      role: "HOD" as const,
    },
    {
      name: "Root",
      email: "root@pipy.site",
      passwordRaw: "MariPriya",
      role: "Principal" as const,
    },
  ];

  for (const admin of initialAdmins) {
    try {
      const hash = await bcrypt.hash(admin.passwordRaw, 10);
      await db.insert(admins).values({
        email: admin.email,
        passwordHash: hash,
        name: admin.name,
        role: admin.role,
        mustChangePassword: true,
      });
      console.log(`✅ Created admin: ${admin.email} (password: ${admin.passwordRaw})`);
    } catch (error: any) {
      if (error?.code === "23505") {
        console.log(`⏭️  Admin ${admin.email} already exists, skipping`);
      } else {
        console.error(`❌ Admin ${admin.email} insert error:`, error.message);
      }
    }
  }

  try {
    await db.insert(settings).values({
      key: "maxWeeklyWorkload",
      value: "18",
    });
    console.log("✅ Set default max weekly workload: 18");
  } catch (error: any) {
    if (error?.code === "23505") {
      console.log("⏭️  Workload setting already exists, skipping");
    } else {
      console.error("❌ Settings insert error:", error.message);
    }
  }

  await client.end();
  console.log("🌱 Seeding complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
