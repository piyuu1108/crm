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

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code;
  const causeCode = (error as { cause?: { code?: string } })?.cause?.code;
  return code === "42703" || code === "42P01" || causeCode === "42703" || causeCode === "42P01";
}

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

    let baseRows: Array<{
      id: number;
      facultyCode: string;
      email: string;
      fullName: string;
      dob: string | null;
      gender: string | null;
      mobile: string;
      qualification: string | null;
      experienceYears: number | null;
      specialization: string | null;
      designation: string | null;
      profileStep: number;
      profileCompletion: string;
    }> = [];

    let schemaReady = true;
    try {
      baseRows = await db
        .select({
          id: faculty.id,
          facultyCode: faculty.facultyCode,
          email: faculty.email,
          fullName: faculty.name,
          dob: faculty.dob,
          gender: faculty.gender,
          mobile: faculty.mobile,
          qualification: faculty.qualification,
          experienceYears: faculty.experienceYears,
          specialization: faculty.specialization,
          designation: faculty.designation,
          profileStep: faculty.profileStep,
          profileCompletion: faculty.profileCompletion,
        })
        .from(faculty)
        .where(eq(faculty.id, facultyId))
        .limit(1);
    } catch (err) {
      if (!isSchemaMissingError(err)) throw err;
      schemaReady = false;
      const fallbackRows = await db
        .select({
          id: faculty.id,
          facultyCode: faculty.facultyCode,
          email: faculty.email,
          fullName: faculty.name,
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

      baseRows = fallbackRows.map((row) => ({
        ...row,
        profileStep: 1,
        profileCompletion: "incomplete",
      }));
    }

    if (!baseRows[0]) {
      return NextResponse.json(
        { success: false, error: "Faculty not found" },
        { status: 404 }
      );
    }

    const [personalRows, contactRows, professionalRows, documentRows] = schemaReady
      ? await Promise.all([
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
        ])
      : [[], [], [], []];

    return NextResponse.json({
      success: true,
      data: {
        ...baseRows[0],
        fullName: personalRows[0]?.fullName ?? baseRows[0].fullName,
        dob: personalRows[0]?.dob ?? baseRows[0].dob,
        gender: personalRows[0]?.gender ?? baseRows[0].gender,
        mobile: contactRows[0]?.mobile ?? baseRows[0].mobile,
        alternateMobile: contactRows[0]?.alternateMobile ?? null,
        address: contactRows[0]?.address ?? null,
        qualification: professionalRows[0]?.qualification ?? baseRows[0].qualification,
        experienceYears:
          professionalRows[0]?.experienceYears ?? baseRows[0].experienceYears,
        specialization:
          professionalRows[0]?.specialization ?? baseRows[0].specialization,
        designation: professionalRows[0]?.designation ?? baseRows[0].designation,
        profilePhotoUrl: documentRows[0]?.profilePhotoUrl ?? null,
      },
    });
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
    console.log(`[PUT /api/faculty/profile] facultyId=${facultyId}, step=${step}, data=`, JSON.stringify(data));

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

    let existingRows: Array<{ id: number; profileStep: number }> = [];
    let schemaReady = true;
    try {
      existingRows = await db
        .select({ id: faculty.id, profileStep: faculty.profileStep })
        .from(faculty)
        .where(eq(faculty.id, facultyId))
        .limit(1);
    } catch (err) {
      if (isSchemaMissingError(err)) {
        schemaReady = false;
        const fallback = await db
          .select({ id: faculty.id })
          .from(faculty)
          .where(eq(faculty.id, facultyId))
          .limit(1);
        existingRows = fallback.map((row) => ({ ...row, profileStep: 1 }));
      } else {
        throw err;
      }
    }

    const existing = existingRows[0];
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

        if (schemaReady) {
          await db
            .insert(facultyPersonalInfo)
            .values({
              facultyId,
              fullName: stepData.fullName.trim(),
              dob: stepData.dob,
              gender: stepData.gender,
            })
            .onConflictDoUpdate({
              target: facultyPersonalInfo.facultyId,
              set: {
                fullName: stepData.fullName.trim(),
                dob: stepData.dob,
                gender: stepData.gender,
              },
            });
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

        if (schemaReady) {
          await db
            .insert(facultyContactInfo)
            .values({
              facultyId,
              mobile: stepData.mobile.replace(/\s+/g, ""),
              alternateMobile: stepData.alternateMobile?.replace(/\s+/g, "") || null,
              address: stepData.address?.trim() || null,
            })
            .onConflictDoUpdate({
              target: facultyContactInfo.facultyId,
              set: {
                mobile: stepData.mobile.replace(/\s+/g, ""),
                alternateMobile: stepData.alternateMobile?.replace(/\s+/g, "") || null,
                address: stepData.address?.trim() || null,
              },
            });
        }

        await db
          .update(faculty)
          .set({ mobile: stepData.mobile.replace(/\s+/g, "") })
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

        if (schemaReady) {
          await db
            .insert(facultyProfessionalInfo)
            .values({
              facultyId,
              qualification: stepData.qualification.trim(),
              experienceYears: Number(stepData.experienceYears),
              specialization: stepData.specialization.trim(),
              designation: stepData.designation.trim(),
            })
            .onConflictDoUpdate({
              target: facultyProfessionalInfo.facultyId,
              set: {
                qualification: stepData.qualification.trim(),
                experienceYears: Number(stepData.experienceYears),
                specialization: stepData.specialization.trim(),
                designation: stepData.designation.trim(),
              },
            });
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

        if (schemaReady) {
          await db
            .insert(facultyDocuments)
            .values({
              facultyId,
              profilePhotoUrl: stepData.profilePhotoUrl!,
            })
            .onConflictDoUpdate({
              target: facultyDocuments.facultyId,
              set: {
                profilePhotoUrl: stepData.profilePhotoUrl!,
              },
            });
        }
        break;
      }
    }

    // profileStep should only ever advance forward — re-saving an earlier step must not regress it
    const newStep = Math.max(existing.profileStep, step + 1);
    const clampedStep = Math.min(newStep, 5);
    console.log(`[PUT /api/faculty/profile] Step ${step} saved. profileStep: ${existing.profileStep} -> ${clampedStep}`);
    if (schemaReady) {
      await db
        .update(faculty)
        .set({
          profileStep: clampedStep,
        })
        .where(eq(faculty.id, facultyId));
    }

    return NextResponse.json({
      success: true,
      data: {
        profileStep: clampedStep,
        schemaReady,
        warning: schemaReady
          ? undefined
          : "Faculty profile migration is pending. Structured profile tables are not persisted yet.",
      },
    });
  } catch (error) {
    console.error("[PUT /api/faculty/profile]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
