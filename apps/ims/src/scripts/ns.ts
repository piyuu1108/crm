import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { admins, settings } from "../db/schema";
import bcrypt from "bcryptjs";
let connectionString = "postgresql://postgres.owzcjkpopzspyrkhsjva:SorryAajPachiDhyanRakha@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

async function seed() {
  console.log("🌱 Starting seed...");
  console.log(
    "📡 Connecting to:",
    connectionString.replace(/:[^:@]+@/, ":***@")
  );

  const client = postgres(connectionString, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
    connect_timeout: 30,
  });

  const db = drizzle(client);

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
      const passwordHash = await bcrypt.hash(admin.passwordRaw, 10);

      const existingUser = await db
        .select()
        .from(admins)
        .where(eq(admins.email, admin.email))
        .limit(1);

      if (existingUser.length > 0) {
        await db
          .update(admins)
          .set({
            passwordHash,
            name: admin.name,
            role: admin.role,
            mustChangePassword: true,
          })
          .where(eq(admins.email, admin.email));

        console.log(`🔄 Updated admin: ${admin.email}`);
      } else {
        await db.insert(admins).values({
          email: admin.email,
          passwordHash,
          name: admin.name,
          role: admin.role,
          mustChangePassword: true,
        });

        console.log(`✅ Created admin: ${admin.email}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed for ${admin.email}:`, error.message);
    }
  }

  try {
    const existingSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "maxWeeklyWorkload"))
      .limit(1);

    if (existingSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: "18",
        })
        .where(eq(settings.key, "maxWeeklyWorkload"));

      console.log("🔄 Updated maxWeeklyWorkload setting");
    } else {
      await db.insert(settings).values({
        key: "maxWeeklyWorkload",
        value: "18",
      });

      console.log("✅ Created maxWeeklyWorkload setting");
    }
  } catch (error: any) {
    console.error("❌ Settings error:", error.message);
  }

  await client.end();

  console.log("🌱 Seed completed successfully!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});