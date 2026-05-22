import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/app/lib/db";
import { faculty } from "@/app/lib/schema";
import { getAuthContext } from "@/app/lib/api-auth";
import {
  validateFacultyStep1,
  validateFacultyStep2,
  validateFacultyStep3,
  validateFacultyStep4,
  type FacultyPersonalInfoData,
  type FacultyContactInfoData,
  type FacultyProfessionalInfoData,
  type FacultyDocumentsData,
} from "@/app/lib/validations/faculty-profile";

async function getAuthenticatedFacultyId(req: NextRequest): Promise<number | null> {
  const auth = await getAuthContext(req);
  if (!auth) return null;
  const roles = auth.roles;
  if (!roles.some((role) => role === "faculty" || role === "counselor" || role === "hod")) {
    return null;
  }
  return auth.userId;
}

export async function POST(req: NextRequest) {
  try {
    const facultyId = await getAuthenticatedFacultyId(req);
    if (!facultyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: faculty role required" },
        { status: 401 }
      );
    }

    // Fetch full faculty record in a single query
    const [row] = await db
      .select({
        id: faculty.id,
        name: faculty.name,
        dob: faculty.dob,
        gender: faculty.gender,
        mobile: faculty.mobile,
        alternateMobile: faculty.alternateMobile,
        address: faculty.address,
        qualification: faculty.qualification,
        experienceYears: faculty.experienceYears,
        specialization: faculty.specialization,
        designation: faculty.designation,
        profilePhotoUrl: faculty.profilePhotoUrl,
      })
      .from(faculty)
      .where(eq(faculty.id, facultyId))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Faculty not found" },
        { status: 404 }
      );
    }

    // Map database fields to the stepper step shapes for validation
    const step1Data: FacultyPersonalInfoData = {
      fullName: row.name,
      dob: row.dob ?? "",
      gender: row.gender ?? "",
    };

    const step2Data: FacultyContactInfoData = {
      mobile: row.mobile,
      alternateMobile: row.alternateMobile ?? undefined,
      address: row.address
        ? {
            line1: row.address.line1,
            city: row.address.city,
            pincode: row.address.pincode,
            kind: row.address.kind,
          }
        : undefined,
    };

    const step3Data: FacultyProfessionalInfoData = {
      qualification: row.qualification ?? "",
      experienceYears: row.experienceYears ?? 0,
      specialization: row.specialization ?? "",
      designation: row.designation ?? "",
    };

    const step4Data: FacultyDocumentsData = {
      profilePhotoUrl: row.profilePhotoUrl ?? undefined,
    };

    // Run validations across all steps
    const step1 = validateFacultyStep1(step1Data);
    const step2 = validateFacultyStep2(step2Data);
    const step3 = validateFacultyStep3(step3Data);
    const step4 = validateFacultyStep4(step4Data);

    const errors = [...step1.errors, ...step2.errors, ...step3.errors, ...step4.errors];
    if (errors.length > 0) {
      console.warn("[POST /api/faculty/profile/submit] 422 — validation errors:", errors);
      return NextResponse.json(
        {
          success: false,
          error: "Profile is incomplete. Please fill all required fields.",
          errors,
        },
        { status: 422 }
      );
    }

    // Persist completion state
    await db
      .update(faculty)
      .set({
        profileCompletion: "complete",
        profileStep: 5,
      })
      .where(eq(faculty.id, facultyId));

    return NextResponse.json({
      success: true,
      data: {
        profileCompletion: "complete",
      },
    });
  } catch (error) {
    console.error("[POST /api/faculty/profile/submit]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
