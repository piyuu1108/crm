"use client";

import React, { useState } from "react";
import { Button, Alert, Separator, Spinner, toast } from "@heroui/react";
import { Check, CircleCheck, CircleXmark } from "@gravity-ui/icons";
import { useSubmitProfileMutation, type ProfileData } from "@/app/lib/queries/profile";
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

interface StepReviewProps {
  profile: ProfileData;
}

// ─── Section display helper ─────────────────────────────────────────────────

function ReviewField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function ReviewSection({
  title,
  children,
  isValid,
}: {
  title: string;
  children: React.ReactNode;
  isValid: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isValid ? (
          <CircleCheck className="size-4 text-success" />
        ) : (
          <CircleXmark className="size-4 text-danger" />
        )}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="ml-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StepReview({ profile }: StepReviewProps) {
  const submitMutation = useSubmitProfileMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const isComplete =
    profile.profileStatus === "complete" || profile.profileStatus === "completed";

  // Build data structures for validation
  const step1: PersonalInfoData = {
    fullName: profile.fullName,
    dob: profile.dob ?? "",
    gender: (profile.gender ?? "") as PersonalInfoData["gender"],
    bloodGroup: (profile.bloodGroup ?? undefined) as PersonalInfoData["bloodGroup"],
  };

  const step2: ContactInfoData = {
    mobile: profile.mobile ?? "",
    parentMobile: profile.parentMobile ?? undefined,
    optionalMobile: profile.optionalMobile ?? undefined,
    address: profile.address ?? {
      current: { line1: "", city: "", pincode: "", kind: "home" },
    },
    aadhaarStudent: profile.aadhaarStudent ?? undefined,
    aadhaarParent: profile.aadhaarParent ?? undefined,
  };

  const step3: AcademicInfoData = {
    category: (profile.category ?? "") as AcademicInfoData["category"],
    board: (profile.board ?? "") as AcademicInfoData["board"],
    twelfthPercent: profile.twelfthPercent ?? "",
    twelfthStream: profile.twelfthStream ?? "",
    schoolName: profile.schoolName ?? "",
    udiseCode: profile.udiseCode ?? undefined,
  };

  const step4: DocumentsData = {
    profilePhoto: profile.profilePhoto ?? undefined,
    lcCertificate: profile.documents?.["lc_certificate"] ?? undefined,
    marksheet10th: profile.documents?.["marksheet_10th"] ?? undefined,
    marksheet12th: profile.documents?.["marksheet_12th"] ?? undefined,
    casteCertificate: profile.documents?.["caste_certificate"] ?? undefined,
    migrationCertificate: profile.documents?.["migration_certificate"] ?? undefined,
  };

  // Per-section validation
  const v1 = validateStep1(step1);
  const v2 = validateStep2(step2);
  const v3 = validateStep3(step3);
  const v4 = validateStep4(step4, step3.category, step3.board);

  const allValid = v1.valid && v2.valid && v3.valid && v4.valid;

  const handleSubmit = async () => {
    setServerError(null);

    try {
      await submitMutation.mutateAsync();
      toast.success("Profile Completed!", {
        description: "Your profile has been submitted successfully.",
      });
    } catch (err) {
      const error = err as Error & { errors?: { field: string; message: string }[] };
      setServerError(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {isComplete && (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Profile Complete</Alert.Title>
            <Alert.Description>
              Your profile has been successfully submitted. You can still review your information below.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {serverError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{serverError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {!allValid && !isComplete && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Incomplete Information</Alert.Title>
            <Alert.Description>
              Some required fields are missing. Please go back and complete all steps before submitting.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Section 1: Personal */}
      <ReviewSection title="Personal Information" isValid={v1.valid}>
        <ReviewField label="Full Name" value={profile.fullName} />
        <ReviewField label="Date of Birth" value={profile.dob} />
        <ReviewField label="Gender" value={profile.gender} />
        <ReviewField label="Blood Group" value={profile.bloodGroup} />
        <ReviewField label="Email" value={profile.email} />
      </ReviewSection>

      <Separator />

      {/* Section 2: Contact */}
      <ReviewSection title="Contact Information" isValid={v2.valid}>
        <ReviewField label="Mobile" value={profile.mobile} />
        <ReviewField label="Parent Mobile" value={profile.parentMobile} />
        <ReviewField label="Optional Mobile" value={profile.optionalMobile} />
        <ReviewField
          label="Stay Address"
          value={
            profile.address?.current
              ? `${profile.address.current.line1}, ${profile.address.current.city} - ${profile.address.current.pincode} (${profile.address.current.kind})`
              : null
          }
        />
        {profile.address?.home && (
          <ReviewField
            label="Home Address"
            value={`${profile.address.home.line1}, ${profile.address.home.city} - ${profile.address.home.pincode}`}
          />
        )}
        <ReviewField label="Student Aadhaar" value={profile.aadhaarStudent} />
        <ReviewField label="Parent Aadhaar" value={profile.aadhaarParent} />
      </ReviewSection>

      <Separator />

      {/* Section 3: Academic */}
      <ReviewSection title="Academic Information" isValid={v3.valid}>
        <ReviewField label="Student ID" value={profile.studentId} />
        <ReviewField label="Course" value={profile.courseName} />
        <ReviewField label="Division" value={profile.currentDivisionName} />
        <ReviewField label="Category" value={profile.category} />
        <ReviewField label="Board" value={profile.board} />
        <ReviewField label="12th Percentage" value={profile.twelfthPercent ? `${profile.twelfthPercent}%` : null} />
        <ReviewField label="12th Stream" value={profile.twelfthStream} />
        <ReviewField label="School Name" value={profile.schoolName} />
        <ReviewField label="UDISE Code" value={profile.udiseCode} />
      </ReviewSection>

      <Separator />

      {/* Section 4: Documents */}
      <ReviewSection title="Documents" isValid={v4.valid}>
        <ReviewField label="Profile Photo" value={profile.profilePhoto ? "✓ Uploaded" : "Missing"} />
        <ReviewField label="LC Certificate" value={profile.documents?.["lc_certificate"] ? "✓ Uploaded" : "Missing"} />
        <ReviewField label="10th Marksheet" value={profile.documents?.["marksheet_10th"] ? "✓ Uploaded" : "Missing"} />
        <ReviewField label="12th Marksheet" value={profile.documents?.["marksheet_12th"] ? "✓ Uploaded" : "Missing"} />
        <ReviewField
          label="Caste Certificate"
          value={
            profile.category && profile.category !== "Open"
              ? profile.documents?.["caste_certificate"]
                ? "✓ Uploaded"
                : "Missing"
              : "Not Required"
          }
        />
        <ReviewField
          label="Migration Certificate"
          value={
            profile.board && profile.board !== "GSEB"
              ? profile.documents?.["migration_certificate"]
                ? "✓ Uploaded"
                : "Missing"
              : "Not Required"
          }
        />
      </ReviewSection>

      {/* Submit Button */}
      {!isComplete && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button
              size="lg"
              isDisabled={!allValid || submitMutation.isPending}
              isPending={submitMutation.isPending}
              onPress={handleSubmit}
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : <Check className="size-4" />}
                  {isPending ? "Submitting…" : "Submit Profile"}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
