import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { classrooms, classroomBenches } from "@/app/lib/schema";
import { requirePermission } from "@/app/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const result = await requirePermission(req, "classes.view");
  if (result instanceof NextResponse) return result;

  const { slug } = await params;

  try {
    // Fetch classroom by room_code (slug)
    const [classroom] = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.roomCode, slug))
      .limit(1);

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: "Classroom not found" },
        { status: 404 }
      );
    }

    // Fetch all benches for this classroom
    const benches = await db
      .select()
      .from(classroomBenches)
      .where(eq(classroomBenches.classroomId, classroom.id))
      .orderBy(classroomBenches.gridY, classroomBenches.gridX);

    const totalBenches = benches.length;
    const activeBenches = benches.filter((b) => b.isActive).length;
    const physicalCapacity = benches.reduce((sum, b) => sum + b.maxStudents, 0);

    return NextResponse.json({
      success: true,
      data: {
        classroom: {
          id: classroom.id,
          roomCode: classroom.roomCode,
          buildingName: classroom.buildingName || "",
          floor: classroom.floor,
          lectureCapacity: classroom.lectureCapacity,
          description: classroom.description || "",
          isActive: classroom.isActive,
          courseId: classroom.courseId,
          createdAt: classroom.createdAt,
        },
        benches: benches.map((b) => ({
          id: b.id,
          label: b.label,
          gridX: b.gridX,
          gridY: b.gridY,
          maxStudents: b.maxStudents,
          isActive: b.isActive,
          notes: b.notes || "",
        })),
        stats: {
          totalBenches,
          activeBenches,
          physicalCapacity,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/classes/:slug] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch classroom details" },
      { status: 500 }
    );
  }
}
