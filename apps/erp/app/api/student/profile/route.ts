import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { students, studentDocuments, courses } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/app/lib/redis";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  type PersonalInfoData,
  type ContactInfoData,
  type AcademicInfoData,
  type DocumentsData,
} from "@/app/lib/validations/profile";

type VerificationStatus = "approved" | "pending" | "rejected" | "incomplete";

function getStatusAfterStudentEdit(currentStatus: string | null | undefined): VerificationStatus {
  if (currentStatus === "approved") return "pending";
  if (currentStatus === "pending") return "pending";
  if (currentStatus === "rejected") return "pending";
  return "incomplete";
}

// ─── Helper: Verify student identity ────────────────────────────────────────

async function getAuthenticatedStudentId(req: NextRequest): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  if (!roles.includes("student")) return null;

  return payload.userId;
}

// ─── GET /api/student/profile ───────────────────────────────────────────────

/**
 * Returns all profile data, current step, profile_status, and documents.
 * Used by frontend to hydrate stepper and resume from saved step.
 */
export async function GET(req: NextRequest) {
  try {
    const studentDbId = await getAuthenticatedStudentId(req);
    if (!studentDbId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: student role required" },
        { status: 401 }
      );
    }

    // Fetch student + course info
    const rows = await db
      .select({
        id: students.id,
        tempId: students.tempId,
        studentId: students.studentId,
        spid: students.spid,
        enrollmentId: students.enrollmentId,
        abcId: students.abcId,
        fullName: students.fullName,
        dob: students.dob,
        gender: students.gender,
        bloodGroup: students.bloodGroup,
        email: students.email,
        mobile: students.mobile,
        parentMobile: students.parentMobile,
        optionalMobile: students.optionalMobile,
        address: students.address,
        aadhaarStudent: students.aadhaarStudent,
        aadhaarParent: students.aadhaarParent,
        courseId: students.courseId,
        category: students.category,
        board: students.board,
        twelfthPercent: students.twelfthPercent,
        twelfthStream: students.twelfthStream,
        schoolName: students.schoolName,
        udiseCode: students.udiseCode,
        entryType: students.entryType,
        entrySemesterNo: students.entrySemesterNo,
        currentSemesterNo: students.currentSemesterNo,
        currentDivisionName: students.currentDivisionName,
        status: students.status,
        profilePhoto: students.profilePhoto,
        profileStep: students.profileStep,
        profileStatus: students.profileStatus,
        // Course denormalized fields
        courseName: courses.name,
        courseCode: courses.code,
      })
      .from(students)
      .innerJoin(courses, eq(students.courseId, courses.id))
      .where(eq(students.id, studentDbId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    // Fetch uploaded documents
    const docs = await db
      .select({
        id: studentDocuments.id,
        docType: studentDocuments.docType,
        filePath: studentDocuments.filePath,
        uploadedAt: studentDocuments.uploadedAt,
      })
      .from(studentDocuments)
      .where(eq(studentDocuments.studentId, studentDbId));

    // Build documents map for easy frontend consumption
    const documentsMap: Record<string, string> = {};
    for (const doc of docs) {
      documentsMap[doc.docType] = doc.filePath;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...rows[0],
        documents: documentsMap,
      },
    });
  } catch (error) {
    console.error("[GET /api/student/profile]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/student/profile ───────────────────────────────────────────────

/**
 * Save step-specific data. Body: { step: 1-4, data: {...} }
 *
 * - Validates step data
 * - Saves only relevant columns
 * - Advances profileStep if this is the furthest step saved
 * - Idempotent: can re-save any step
 */
export async function PUT(req: NextRequest) {
  try {
    const studentDbId = await getAuthenticatedStudentId(req);
    if (!studentDbId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: student role required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { step, data } = body;

    if (!step || ![1, 2, 3, 4].includes(step)) {
      return NextResponse.json(
        { success: false, error: "Invalid step (must be 1-4)" },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing step data" },
        { status: 400 }
      );
    }

    // Check student exists and is not already completed
    const existing = await db
      .select({
        id: students.id,
        profileStatus: students.profileStatus,
        profileStep: students.profileStep,
        category: students.category,
        board: students.board,
        status: students.status,
      })
      .from(students)
      .where(eq(students.id, studentDbId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    const student = existing[0];

    // Allow re-editing even after completion (soft restriction)
    // But don't change profileStatus back

    // ── Validate + build update based on step ───────────────────────────────
    let updatePayload: Record<string, unknown> = {};

    switch (step) {
      case 1: {
        const stepData = data as PersonalInfoData;
        const validation = validateStep1(stepData);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }
        updatePayload = {
          fullName: stepData.fullName.trim(),
          dob: stepData.dob,
          gender: stepData.gender,
          bloodGroup: stepData.bloodGroup || null,
        };
        break;
      }

      case 2: {
        const stepData = data as ContactInfoData;
        const validation = validateStep2(stepData);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }
        updatePayload = {
          mobile: stepData.mobile.replace(/\s+/g, ""),
          parentMobile: stepData.parentMobile?.replace(/\s+/g, "") || null,
          optionalMobile: stepData.optionalMobile?.replace(/\s+/g, "") || null,
          address: stepData.address.trim(),
          aadhaarStudent: stepData.aadhaarStudent?.replace(/\s+/g, "") || null,
          aadhaarParent: stepData.aadhaarParent?.replace(/\s+/g, "") || null,
        };
        break;
      }

      case 3: {
        const stepData = data as AcademicInfoData;
        const validation = validateStep3(stepData);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }
        updatePayload = {
          category: stepData.category,
          board: stepData.board,
          twelfthPercent: String(stepData.twelfthPercent),
          twelfthStream: stepData.twelfthStream.trim(),
          schoolName: stepData.schoolName.trim(),
          udiseCode: stepData.udiseCode?.trim() || null,
        };
        break;
      }

      case 4: {
        const stepData = data as DocumentsData;
        // Validation uses category/board from student record for conditional checks
        const validation = validateStep4(stepData, student.category ?? undefined, student.board ?? undefined);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }

        // Profile photo goes to students table
        if (stepData.profilePhoto) {
          updatePayload.profilePhoto = stepData.profilePhoto;
        }

        // Upsert document records
        const docEntries: { docType: string; filePath: string }[] = [];
        if (stepData.lcCertificate) docEntries.push({ docType: "lc_certificate", filePath: stepData.lcCertificate });
        if (stepData.marksheet10th) docEntries.push({ docType: "marksheet_10th", filePath: stepData.marksheet10th });
        if (stepData.marksheet12th) docEntries.push({ docType: "marksheet_12th", filePath: stepData.marksheet12th });
        if (stepData.casteCertificate) docEntries.push({ docType: "caste_certificate", filePath: stepData.casteCertificate });
        if (stepData.migrationCertificate) docEntries.push({ docType: "migration_certificate", filePath: stepData.migrationCertificate });

        // Delete existing docs for this student and re-insert (idempotent upsert)
        if (docEntries.length > 0) {
          // Remove old entries for these doc types
          for (const entry of docEntries) {
            const existingDoc = await db
              .select({ id: studentDocuments.id })
              .from(studentDocuments)
              .where(eq(studentDocuments.studentId, studentDbId))
              .limit(100);

            // Filter by docType — drizzle doesn't have compound AND in delete easily,
            // so we'll use raw approach: delete all, re-insert
          }

          // Simpler: delete all existing docs, re-insert with current data
          // This is safe because documents are fully replaced on each step 4 save
          const { and: drizzleAnd } = await import("drizzle-orm");
          for (const entry of docEntries) {
            // Delete existing doc of this type for student
            await db.delete(studentDocuments).where(
              drizzleAnd(
                eq(studentDocuments.studentId, studentDbId),
                eq(studentDocuments.docType, entry.docType)
              )
            );
            // Insert new
            await db.insert(studentDocuments).values({
              studentId: studentDbId,
              docType: entry.docType,
              filePath: entry.filePath,
            });
          }
        }

        break;
      }
    }

    // ── Advance profileStep if this step is further than current ─────────────
    const newStep = Math.max(student.profileStep, step + 1);
    // Clamp to 5 max
    const clampedStep = Math.min(newStep, 5);

    const nextStatus = getStatusAfterStudentEdit(student.status);

    await db
      .update(students)
      .set({
        ...updatePayload,
        profileStep: clampedStep,
        status: nextStatus,
      })
      .where(eq(students.id, studentDbId));

    try {
      await redis.del(`dashboard:user:${studentDbId}:role:student`);
    } catch (cacheError) {
      console.warn("[student profile edit] cache clear failed:", cacheError);
    }

    return NextResponse.json({
      success: true,
      data: { profileStep: clampedStep },
    });
  } catch (error) {
    console.error("[PUT /api/student/profile]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
