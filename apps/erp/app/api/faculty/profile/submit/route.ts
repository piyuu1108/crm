import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/app/lib/db";
import {
  faculty,
  facultyContactInfo,
  facultyDocuments,
  facultyPersonalInfo,
  facultyProfessionalInfo,
} from "@/app/lib/schema";
import { verifyToken } from "@/app/lib/auth";
import {
  validateFacultyStep1,
  validateFacultyStep2,
  validateFacultyStep3,
  validateFacultyStep4,
} from "@/app/lib/validations/faculty-profile";

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code;
  const causeCode = (error as { cause?: { code?: string } })?.cause?.code;
  return code === "42703" || code === "42P01" || causeCode === "42703" || causeCode === "42P01";
}

async function getAuthenticatedFacultyId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;
  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  if (!roles.some((role) => role === "faculty" || role === "counselor" || role === "hod")) {
    return null;
  }
  return payload.userId;
}

export async function POST(req: NextRequest) {
  try {
    const facultyId = await getAuthenticatedFacultyId();
    if (!facultyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: faculty role required" },
        { status: 401 }
      );
    }

    let baseRows: Array<{
      id: number;
      name: string;
      dob: string | null;
      gender: string | null;
      mobile: string;
      qualification: string | null;
      experienceYears: number | null;
      specialization: string | null;
      designation: string | null;
    }> = [];
    let personalRows: Array<{ fullName: string; dob: string | null; gender: string | null }> =
      [];
    let contactRows: Array<{
      mobile: string;
      alternateMobile: string | null;
      address: string | null;
    }> = [];
    let professionalRows: Array<{
      qualification: string | null;
      experienceYears: number | null;
      specialization: string | null;
      designation: string | null;
    }> = [];
    let documentsRows: Array<{ profilePhotoUrl: string }> = [];

    let schemaReady = true;
    try {
      [baseRows, personalRows, contactRows, professionalRows, documentsRows] =
        await Promise.all([
          db
            .select({
              id: faculty.id,
              name: faculty.name,
              dob: faculty.dob,
              gender: faculty.gender,
              mobile: faculty.mobile,
              qualification: faculty.qualification,
              experienceYears: faculty.experienceYears,
              specialization: faculty.specialization,
              designation: faculty.designation,
            })
            .from(faculty)
            .where(eq(faculty.id, facultyId))
            .limit(1),
          db
            .select({
              fullName: facultyPersonalInfo.fullName,
              dob: facultyPersonalInfo.dob,
              gender: facultyPersonalInfo.gender,
            })
            .from(facultyPersonalInfo)
            .where(eq(facultyPersonalInfo.facultyId, facultyId))
            .limit(1),
          db
            .select({
              mobile: facultyContactInfo.mobile,
              alternateMobile: facultyContactInfo.alternateMobile,
              address: facultyContactInfo.address,
            })
            .from(facultyContactInfo)
            .where(eq(facultyContactInfo.facultyId, facultyId))
            .limit(1),
          db
            .select({
              qualification: facultyProfessionalInfo.qualification,
              experienceYears: facultyProfessionalInfo.experienceYears,
              specialization: facultyProfessionalInfo.specialization,
              designation: facultyProfessionalInfo.designation,
            })
            .from(facultyProfessionalInfo)
            .where(eq(facultyProfessionalInfo.facultyId, facultyId))
            .limit(1),
          db
            .select({
              profilePhotoUrl: facultyDocuments.profilePhotoUrl,
            })
            .from(facultyDocuments)
            .where(eq(facultyDocuments.facultyId, facultyId))
            .limit(1),
        ]);
    } catch (err) {
      if (isSchemaMissingError(err)) {
        schemaReady = false;
        baseRows = await db
          .select({
            id: faculty.id,
            name: faculty.name,
            dob: faculty.dob,
            gender: faculty.gender,
            mobile: faculty.mobile,
            qualification: faculty.qualification,
            experienceYears: faculty.experienceYears,
            specialization: faculty.specialization,
            designation: faculty.designation,
          })
          .from(faculty)
          .where(eq(faculty.id, facultyId))
          .limit(1);
        personalRows = [];
        contactRows = [];
        professionalRows = [];
        documentsRows = [];
      } else {
        throw err;
      }
    }

    const base = baseRows[0];
    if (!base) {
      return NextResponse.json(
        { success: false, error: "Faculty not found" },
        { status: 404 }
      );
    }

    const step1Data = {
      fullName: personalRows[0]?.fullName ?? base.name,
      dob: personalRows[0]?.dob ?? base.dob ?? "",
      gender: personalRows[0]?.gender ?? base.gender ?? "",
    };
    const step2Data = {
      mobile: contactRows[0]?.mobile ?? base.mobile,
      alternateMobile: contactRows[0]?.alternateMobile ?? undefined,
      address: contactRows[0]?.address ?? undefined,
    };
    const step3Data = {
      qualification: professionalRows[0]?.qualification ?? base.qualification ?? "",
      experienceYears:
        professionalRows[0]?.experienceYears ?? base.experienceYears ?? 0,
      specialization: professionalRows[0]?.specialization ?? base.specialization ?? "",
      designation: professionalRows[0]?.designation ?? base.designation ?? "",
    };
    const step4Data = {
      profilePhotoUrl: documentsRows[0]?.profilePhotoUrl ?? undefined,
    };

    console.log("[POST /api/faculty/profile/submit] Validation inputs:", {
      step1: step1Data,
      step2: step2Data,
      step3: step3Data,
      step4: step4Data,
    });

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

    if (schemaReady) {
      await db
        .update(faculty)
        .set({
          profileCompletion: "complete",
          profileStep: 5,
        })
        .where(eq(faculty.id, facultyId));
    }

    return NextResponse.json({
      success: true,
      data: {
        profileCompletion: schemaReady ? "complete" : "incomplete",
        schemaReady,
        warning: schemaReady
          ? undefined
          : "Faculty profile migration is pending. Completion state cannot be persisted yet.",
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
