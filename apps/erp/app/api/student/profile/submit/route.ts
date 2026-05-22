import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { students, studentDocuments } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { cacheTags, clearCache } from "@/app/lib/cache";
import {
  validateAllSteps,
  type PersonalInfoData,
  type ContactInfoData,
  type AcademicInfoData,
  type DocumentsData,
} from "@/app/lib/validations/profile";

/**
 * POST /api/student/profile/submit
 *
 * Final submit — runs full validation across all steps,
 * then moves verification to "pending" for admin review.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const roles = auth.roles;
    if (!roles.includes("student")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: student role required" },
        { status: 403 }
      );
    }

    const studentDbId = auth.userId;

    // Fetch full student record
    const rows = await db
      .select()
      .from(students)
      .where(eq(students.id, studentDbId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    const student = rows[0];

    // Build step data from DB to re-validate
    const step1: PersonalInfoData = {
      fullName: student.fullName,
      dob: student.dob ?? "",
      gender: student.gender ?? "",
      bloodGroup: student.bloodGroup ?? undefined,
    };

    const step2: ContactInfoData = {
      mobile: student.mobile ?? "",
      parentMobile: student.parentMobile ?? undefined,
      optionalMobile: student.optionalMobile ?? undefined,
      address: (student.address as import("@/app/lib/validations/profile").StudentAddressData | null) ?? {
        current: { line1: "", city: "", pincode: "", kind: "home" },
      },
      aadhaarStudent: student.aadhaarStudent ?? undefined,
      aadhaarParent: student.aadhaarParent ?? undefined,
    };

    const step3: AcademicInfoData = {
      category: student.category ?? "",
      board: student.board ?? "",
      twelfthPercent: student.twelfthPercent ?? "",
      twelfthStream: student.twelfthStream ?? "",
      schoolName: student.schoolName ?? "",
      udiseCode: student.udiseCode ?? undefined,
    };

    // Fetch documents
    const docs = await db
      .select({
        docType: studentDocuments.docType,
        filePath: studentDocuments.filePath,
      })
      .from(studentDocuments)
      .where(eq(studentDocuments.studentId, studentDbId));

    const docsMap: Record<string, string> = {};
    for (const doc of docs) {
      docsMap[doc.docType] = doc.filePath;
    }

    const step4: DocumentsData = {
      profilePhoto: student.profilePhoto ?? undefined,
      lcCertificate: docsMap["lc_certificate"],
      marksheet10th: docsMap["marksheet_10th"],
      marksheet12th: docsMap["marksheet_12th"],
      casteCertificate: docsMap["caste_certificate"],
      migrationCertificate: docsMap["migration_certificate"],
    };

    // Full validation
    const validation = validateAllSteps(step1, step2, step3, step4);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile is incomplete. Please fill all required fields.",
          errors: validation.errors,
        },
        { status: 422 }
      );
    }

    // Mark profile as complete for stepper flow, but keep verification pending
    // so HOD/Counselor can approve/reject after every submission.
    await db
      .update(students)
      .set({
        profileStatus: "complete",
        profileStep: 5,
        status: "pending",
      })
      .where(eq(students.id, studentDbId));

    try {
      await clearCache(cacheTags.dashboard.user(studentDbId));
    } catch (cacheError) {
      console.warn("[student profile submit] cache clear failed:", cacheError);
    }

    return NextResponse.json({
      success: true,
      data: { profileStatus: "complete", status: "pending" },
    });
  } catch (error) {
    console.error("[POST /api/student/profile/submit]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
