import "dotenv/config";
import { db } from "../db";
import { roles } from "../schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Seeding administrator roles...");

  const adminRoles = ["principal", "vice_principal"];

  for (const roleName of adminRoles) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (existing.length === 0) {
      console.log(`Creating role: ${roleName}`);
      await db.insert(roles).values({ name: roleName });
    } else {
      console.log(`Role ${roleName} already exists.`);
    }
  }

  console.log("Administrator roles seeded successfully!");
}

run().catch((err) => {
  console.error("Failed to seed administrator roles:", err);
  process.exit(1);
});
