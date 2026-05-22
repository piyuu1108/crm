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

export async function GET(req: NextRequest) {
  try {
    const facultyId = await getAuthenticatedFacultyId(req);
    if (!facultyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: faculty role required" },
        { status: 401 }
      );
    }

    const [row] = await db
      .select({
        id: faculty.id,
        facultyCode: faculty.facultyCode,
        email: faculty.email,
        fullName: faculty.name,
        dob: faculty.dob,
        gender: faculty.gender,
        mobile: faculty.mobile,
        alternateMobile: faculty.alternateMobile,
        address: faculty.address,
        qualification: faculty.qualification,
        experienceYears: faculty.experienceYears,
        specialization: faculty.specialization,
        designation: faculty.designation,
        profileStep: faculty.profileStep,
        profileCompletion: faculty.profileCompletion,
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

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error("[GET /api/faculty/profile]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const facultyId = await getAuthenticatedFacultyId(req);
    if (!facultyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: faculty role required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { step, data } = body;
    console.log(`[PUT /api/faculty/profile] facultyId=${facultyId}, step=${step}`);

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

    const [existing] = await db
      .select({ id: faculty.id, profileStep: faculty.profileStep })
      .from(faculty)
      .where(eq(faculty.id, facultyId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Faculty not found" },
        { status: 404 }
      );
    }

    switch (step) {
      case 1: {
        const stepData = data as FacultyPersonalInfoData;
        const validation = validateFacultyStep1(stepData);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }
        await db
          .update(faculty)
          .set({
            name: stepData.fullName.trim(),
            dob: stepData.dob,
            gender: stepData.gender,
          })
          .where(eq(faculty.id, facultyId));
        break;
      }

      case 2: {
        const stepData = data as FacultyContactInfoData;
        const validation = validateFacultyStep2(stepData);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }
        await db
          .update(faculty)
          .set({
            mobile: stepData.mobile.replace(/\s+/g, ""),
            alternateMobile: stepData.alternateMobile?.replace(/\s+/g, "") || null,
            address: stepData.address
              ? {
                  line1: stepData.address.line1.trim(),
                  city: stepData.address.city.trim(),
                  pincode: stepData.address.pincode.trim(),
                  kind: stepData.address.kind,
                }
              : null,
          })
          .where(eq(faculty.id, facultyId));
        break;
      }

      case 3: {
        const stepData = data as FacultyProfessionalInfoData;
        const validation = validateFacultyStep3(stepData);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }
        await db
          .update(faculty)
          .set({
            qualification: stepData.qualification.trim(),
            experienceYears: Number(stepData.experienceYears),
            specialization: stepData.specialization.trim(),
            designation: stepData.designation.trim(),
          })
          .where(eq(faculty.id, facultyId));
        break;
      }

      case 4: {
        const stepData = data as FacultyDocumentsData;
        const validation = validateFacultyStep4(stepData);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: "Validation failed", errors: validation.errors },
            { status: 422 }
          );
        }
        await db
          .update(faculty)
          .set({ profilePhotoUrl: stepData.profilePhotoUrl ?? null })
          .where(eq(faculty.id, facultyId));
        break;
      }
    }

    // profileStep only ever advances forward
    const newStep = Math.max(existing.profileStep, step + 1);
    const clampedStep = Math.min(newStep, 5);

    await db
      .update(faculty)
      .set({ profileStep: clampedStep })
      .where(eq(faculty.id, facultyId));

    console.log(`[PUT /api/faculty/profile] Step ${step} saved. profileStep: ${existing.profileStep} -> ${clampedStep}`);

    return NextResponse.json({
      success: true,
      data: { profileStep: clampedStep },
    });
  } catch (error) {
    console.error("[PUT /api/faculty/profile]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
