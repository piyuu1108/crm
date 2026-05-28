import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { classrooms, classroomBenches } from "@/app/lib/schema";
import { requirePermission } from "@/app/lib/api-auth";
import { eq } from "drizzle-orm";
import { AuditLogger } from "@/app/lib/audit-logger";

interface BenchPayload {
  label: string;
  gridX: number;
  gridY: number;
  maxStudents: number;
  isActive: boolean;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const result = await requirePermission(req, "classes.manage");
  if (result instanceof NextResponse) return result;
  const auth = result;

  const { slug } = await params;

  const audit = AuditLogger.start(req, auth, {
    action: "classes.layout_update",
    category: "admin",
    summary: "Updated classroom layout",
  });

  try {
    const body = await req.json();
    const benches: BenchPayload[] = body.benches;

    if (!Array.isArray(benches)) {
      return audit.error(
        "Invalid payload: benches array required",
        NextResponse.json({ success: false, error: "Invalid payload: benches array required" }, { status: 400 })
      );
    }

    // Validate bench data
    for (const bench of benches) {
      if (!bench.label || bench.gridX == null || bench.gridY == null) {
        return audit.error(
          "Invalid bench data: missing required fields",
          NextResponse.json({ success: false, error: `Invalid bench data: missing required fields` }, { status: 400 })
        );
      }
      if (bench.maxStudents < 1 || bench.maxStudents > 4) {
        return audit.error(
          `Invalid capacity for bench ${bench.label}: must be 1-4`,
          NextResponse.json({ success: false, error: `Invalid capacity for bench ${bench.label}: must be 1-4` }, { status: 400 })
        );
      }
    }

    // Check for duplicate grid positions
    const gridKeys = new Set<string>();
    for (const bench of benches) {
      const key = `${bench.gridX},${bench.gridY}`;
      if (gridKeys.has(key)) {
        return audit.error(
          `Duplicate grid position: (${bench.gridX}, ${bench.gridY})`,
          NextResponse.json({ success: false, error: `Duplicate grid position: (${bench.gridX}, ${bench.gridY})` }, { status: 400 })
        );
      }
      gridKeys.add(key);
    }

    // Find classroom by slug (room_code)
    const [classroom] = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.roomCode, slug))
      .limit(1);

    if (!classroom) {
      return audit.error(
        "Classroom not found",
        NextResponse.json({ success: false, error: "Classroom not found" }, { status: 404 })
      );
    }

    // Transaction: delete existing benches and insert new ones
    await db.transaction(async (tx) => {
      // Delete all existing benches for this classroom
      await tx
        .delete(classroomBenches)
        .where(eq(classroomBenches.classroomId, classroom.id));

      // Insert new benches
      if (benches.length > 0) {
        await tx.insert(classroomBenches).values(
          benches.map((b) => ({
            classroomId: classroom.id,
            label: b.label,
            gridX: b.gridX,
            gridY: b.gridY,
            maxStudents: b.maxStudents,
            isActive: b.isActive,
          }))
        );
      }
    });

    // Fetch the updated benches to return
    const updatedBenches = await db
      .select()
      .from(classroomBenches)
      .where(eq(classroomBenches.classroomId, classroom.id))
      .orderBy(classroomBenches.gridY, classroomBenches.gridX);

    const totalBenches = updatedBenches.length;
    const activeBenches = updatedBenches.filter((b) => b.isActive).length;
    const physicalCapacity = updatedBenches.reduce((sum, b) => sum + b.maxStudents, 0);

    return audit.success(NextResponse.json({
      success: true,
      data: {
        benches: updatedBenches.map((b) => ({
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
    }), { room: slug, total: totalBenches, eid: String(classroom.id) });
  } catch (error) {
    return audit.error(error);
  }
}
