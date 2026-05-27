import fs from "fs";
import path from "path";

// Load .env manually BEFORE importing any db dependencies
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

async function run() {
  console.log("Loading db module dynamically...");
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");

  // Get first course ID
  const courses = await db.execute(sql`SELECT id FROM courses LIMIT 1`);
  if (!courses.rows || courses.rows.length === 0) {
    console.error("No courses found in the database. Please create a course first.");
    process.exit(1);
  }
  const courseId = (courses.rows[0] as any).id;
  console.log(`Using course ID: ${courseId}`);

  const classroomData = [
    { roomCode: "G1", buildingName: "Main Building", floor: "Ground", lectureCapacity: 80, description: "Ground floor lecture hall 1" },
    { roomCode: "G2", buildingName: "Main Building", floor: "Ground", lectureCapacity: 60, description: "Ground floor lecture hall 2" },
    { roomCode: "G3", buildingName: "Main Building", floor: "Ground", lectureCapacity: 40, description: "Ground floor seminar room" },
    { roomCode: "F1", buildingName: "Main Building", floor: "First", lectureCapacity: 80, description: "First floor lecture hall 1" },
    { roomCode: "F2", buildingName: "Main Building", floor: "First", lectureCapacity: 60, description: "First floor lecture hall 2" },
    { roomCode: "F3", buildingName: "Main Building", floor: "First", lectureCapacity: 40, description: "First floor seminar room" },
    { roomCode: "S1", buildingName: "Main Building", floor: "Second", lectureCapacity: 80, description: "Second floor lecture hall 1" },
    { roomCode: "S2", buildingName: "Main Building", floor: "Second", lectureCapacity: 60, description: "Second floor lecture hall 2" },
    { roomCode: "LAB1", buildingName: "Science Block", floor: "Ground", lectureCapacity: 30, description: "Computer Lab 1" },
    { roomCode: "LAB2", buildingName: "Science Block", floor: "First", lectureCapacity: 30, description: "Computer Lab 2" },
  ];

  console.log("Seeding classrooms...");
  for (const c of classroomData) {
    try {
      await db.execute(sql`
        INSERT INTO "classrooms" ("room_code", "building_name", "floor", "lecture_capacity", "description", "course_id")
        VALUES (${c.roomCode}, ${c.buildingName}, ${c.floor}, ${c.lectureCapacity}, ${c.description}, ${courseId})
        ON CONFLICT ("room_code") DO NOTHING
      `);
      console.log(`  ✓ ${c.roomCode}`);
    } catch (err: any) {
      console.log(`  ⚠ ${c.roomCode} — ${err.message}`);
    }
  }

  // Add a sample layout to G1 (4 rows × 5 cols, capacity 2)
  console.log("\nSeeding bench layout for G1...");
  const g1Result = await db.execute(sql`SELECT id FROM "classrooms" WHERE "room_code" = 'G1' LIMIT 1`);
  if (g1Result.rows && g1Result.rows.length > 0) {
    const g1Id = (g1Result.rows[0] as any).id;

    // Clear existing benches
    await db.execute(sql`DELETE FROM "classroom_benches" WHERE "classroom_id" = ${g1Id}`);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 5; x++) {
        const label = `${String.fromCharCode(65 + y)}${x + 1}`;
        await db.execute(sql`
          INSERT INTO "classroom_benches" ("classroom_id", "label", "grid_x", "grid_y", "max_students", "is_active")
          VALUES (${g1Id}, ${label}, ${x}, ${y}, 2, true)
        `);
      }
    }
    console.log("  ✓ G1 layout: 4×5 grid, capacity 2 per bench");
  }

  // Add a sample layout to F1 (3 rows × 4 cols, mixed capacity)
  console.log("Seeding bench layout for F1...");
  const f1Result = await db.execute(sql`SELECT id FROM "classrooms" WHERE "room_code" = 'F1' LIMIT 1`);
  if (f1Result.rows && f1Result.rows.length > 0) {
    const f1Id = (f1Result.rows[0] as any).id;

    await db.execute(sql`DELETE FROM "classroom_benches" WHERE "classroom_id" = ${f1Id}`);

    const capacities = [3, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 3];
    let idx = 0;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        const label = `${String.fromCharCode(65 + y)}${x + 1}`;
        await db.execute(sql`
          INSERT INTO "classroom_benches" ("classroom_id", "label", "grid_x", "grid_y", "max_students", "is_active")
          VALUES (${f1Id}, ${label}, ${x}, ${y}, ${capacities[idx]}, true)
        `);
        idx++;
      }
    }
    console.log("  ✓ F1 layout: 3×4 grid, mixed capacity");
  }

  console.log("\nSeed completed successfully!");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
