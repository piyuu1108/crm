import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { classrooms, classroomBenches, courses } from "@/app/lib/schema";
import { requirePermission } from "@/app/lib/api-auth";
import { eq, sql, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const result = await requirePermission(req, "classes.view");
  if (result instanceof NextResponse) return result;

  try {
    // Fetch all classrooms with bench aggregation
    const rows = await db
      .select({
        id: classrooms.id,
        roomCode: classrooms.roomCode,
        buildingName: classrooms.buildingName,
        floor: classrooms.floor,
        lectureCapacity: classrooms.lectureCapacity,
        description: classrooms.description,
        isActive: classrooms.isActive,
        courseId: classrooms.courseId,
        createdAt: classrooms.createdAt,
        totalBenches: sql<number>`COALESCE(COUNT(${classroomBenches.id}), 0)`.as("total_benches"),
        activeBenches: sql<number>`COALESCE(SUM(CASE WHEN ${classroomBenches.isActive} = true THEN 1 ELSE 0 END), 0)`.as("active_benches"),
        physicalCapacity: sql<number>`COALESCE(SUM(${classroomBenches.maxStudents}), 0)`.as("physical_capacity"),
      })
      .from(classrooms)
      .leftJoin(classroomBenches, eq(classroomBenches.classroomId, classrooms.id))
      .groupBy(classrooms.id)
      .orderBy(classrooms.roomCode);

    const data = rows.map((row) => ({
      id: row.id,
      roomCode: row.roomCode,
      buildingName: row.buildingName || "",
      floor: row.floor,
      lectureCapacity: row.lectureCapacity,
      description: row.description || "",
      isActive: row.isActive,
      courseId: row.courseId,
      createdAt: row.createdAt,
      totalBenches: Number(row.totalBenches),
      activeBenches: Number(row.activeBenches),
      physicalCapacity: Number(row.physicalCapacity),
      hasLayout: Number(row.totalBenches) > 0,
    }));

    // Compute KPI summaries
    const kpi = {
      totalClasses: data.length,
      totalPhysicalCapacity: data.reduce((sum, c) => sum + c.physicalCapacity, 0),
      totalActiveBenches: data.reduce((sum, c) => sum + c.activeBenches, 0),
      configuredLayouts: data.filter((c) => c.hasLayout).length,
      unconfiguredLayouts: data.filter((c) => !c.hasLayout).length,
    };

    return NextResponse.json({
      success: true,
      data: { classrooms: data, kpi },
    });
  } catch (error) {
    console.error("[GET /api/classes] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch classrooms" },
      { status: 500 }
    );
  }
}
