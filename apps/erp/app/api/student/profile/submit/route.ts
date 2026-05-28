import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import { students, studentDocuments } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { cacheTags, clearCache } from "@/app/lib/cache";
import { AuditLogger } from "@/app/lib/audit-logger";
import {
  StudentProfileSchema,
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
  const auth = await requirePermission(req, "profile.edit_student");
  if (auth instanceof NextResponse) return auth;
  const studentDbId = auth.userId;

  const audit = AuditLogger.start(req, auth, {
    action: "student.submit_profile",
    category: "profile",
    summary: "Submitted student profile for verification",
    entityType: "student",
    entityId: studentDbId,
  });

  try {
    // Fetch full student record
    const rows = await db
      .select()
      .from(students)
      .where(eq(students.id, studentDbId))
      .limit(1);

    if (rows.length === 0) {
      return audit.error("Student not found", undefined, 404);
    }

    const student = rows[0];

    // Build step data from DB to re-validate
    const step1: PersonalInfoData = {
      fullName: student.fullName,
      dob: student.dob ?? "",
      gender: (student.gender ?? "") as PersonalInfoData["gender"],
      bloodGroup: (student.bloodGroup ?? undefined) as PersonalInfoData["bloodGroup"],
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
      category: (student.category ?? "") as AcademicInfoData["category"],
      board: (student.board ?? "") as AcademicInfoData["board"],
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
    const validation = StudentProfileSchema.safeParse({ step1, step2, step3, step4 });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((i: any) => { errors[i.path.join(".")] = i.message; });
      return audit.error(
        "Profile is incomplete. Please fill all required fields.",
        NextResponse.json(
          { success: false, error: "Profile is incomplete. Please fill all required fields.", errors },
          { status: 422 }
        )
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

    return audit.success(
      NextResponse.json({
        success: true,
        data: { profileStatus: "complete", status: "pending" },
      }),
      {
        eid: String(studentDbId),
      }
    );
  } catch (error) {
    return audit.error(error);
  }
}
