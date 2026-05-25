import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/app/lib/db";
import { faculty, administrators } from "@/app/lib/schema";
import { requirePermission } from "@/app/lib/api-auth";
import { isAdminTableRole } from "@/app/lib/permissions";
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

export async function GET(req: NextRequest) {
  try {
    const result = await requirePermission(req, "profile.edit_faculty");
    if (result instanceof NextResponse) return result;
    const auth = result;

    const isAdmin = isAdminTableRole(auth.activeRole);

    let row;
    if (isAdmin) {
      const [adminRow] = await db
        .select({
          id: administrators.id,
          facultyCode: administrators.adminCode,
          email: administrators.email,
          fullName: administrators.name,
          dob: administrators.dob,
          gender: administrators.gender,
          mobile: administrators.mobile,
          alternateMobile: administrators.alternateMobile,
          address: administrators.address,
          qualification: administrators.qualification,
          experienceYears: administrators.experienceYears,
          specialization: administrators.specialization,
          designation: administrators.designation,
          profileStep: administrators.profileStep,
          profileCompletion: administrators.profileCompletion,
          profilePhotoUrl: administrators.profilePhotoUrl,
        })
        .from(administrators)
        .where(eq(administrators.id, auth.userId))
        .limit(1);
      row = adminRow;
    } else {
      const [facRow] = await db
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
        .where(eq(faculty.id, auth.userId))
        .limit(1);
      row = facRow;
    }

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
    const result = await requirePermission(req, "profile.edit_faculty");
    if (result instanceof NextResponse) return result;
    const auth = result;

    const isAdmin = isAdminTableRole(auth.activeRole);

    const body = await req.json();
    const { step, data } = body;
    console.log(`[PUT /api/faculty/profile] facultyId=${auth.userId}, step=${step}`);

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

    let existing;
    if (isAdmin) {
      const [adminRow] = await db
        .select({ id: administrators.id, profileStep: administrators.profileStep })
        .from(administrators)
        .where(eq(administrators.id, auth.userId))
        .limit(1);
      existing = adminRow;
    } else {
      const [facRow] = await db
        .select({ id: faculty.id, profileStep: faculty.profileStep })
        .from(faculty)
        .where(eq(faculty.id, auth.userId))
        .limit(1);
      existing = facRow;
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
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
        if (isAdmin) {
          await db
            .update(administrators)
            .set({
              name: stepData.fullName.trim(),
              dob: stepData.dob,
              gender: stepData.gender,
            })
            .where(eq(administrators.id, auth.userId));
        } else {
          await db
            .update(faculty)
            .set({
              name: stepData.fullName.trim(),
              dob: stepData.dob,
              gender: stepData.gender,
            })
            .where(eq(faculty.id, auth.userId));
        }
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
        const setParams = {
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
        };
        if (isAdmin) {
          await db
            .update(administrators)
            .set(setParams)
            .where(eq(administrators.id, auth.userId));
        } else {
          await db
            .update(faculty)
            .set(setParams)
            .where(eq(faculty.id, auth.userId));
        }
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
        const setParams = {
          qualification: stepData.qualification.trim(),
          experienceYears: Number(stepData.experienceYears),
          specialization: stepData.specialization.trim(),
          designation: stepData.designation.trim(),
        };
        if (isAdmin) {
          await db
            .update(administrators)
            .set(setParams)
            .where(eq(administrators.id, auth.userId));
        } else {
          await db
            .update(faculty)
            .set(setParams)
            .where(eq(faculty.id, auth.userId));
        }
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
        if (isAdmin) {
          await db
            .update(administrators)
            .set({ profilePhotoUrl: stepData.profilePhotoUrl ?? null })
            .where(eq(administrators.id, auth.userId));
        } else {
          await db
            .update(faculty)
            .set({ profilePhotoUrl: stepData.profilePhotoUrl ?? null })
            .where(eq(faculty.id, auth.userId));
        }
        break;
      }
    }

    // profileStep only ever advances forward
    const newStep = Math.max(existing.profileStep, step + 1);
    const clampedStep = Math.min(newStep, 5);

    if (isAdmin) {
      await db
        .update(administrators)
        .set({ profileStep: clampedStep })
        .where(eq(administrators.id, auth.userId));
    } else {
      await db
        .update(faculty)
        .set({ profileStep: clampedStep })
        .where(eq(faculty.id, auth.userId));
    }

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
