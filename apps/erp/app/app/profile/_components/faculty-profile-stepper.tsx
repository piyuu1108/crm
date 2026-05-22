"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  ListBox,
  ProgressBar,
  Select,
  Separator,
  Spinner,
  TextField,
  toast,
  type Key,
} from "@heroui/react";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Picture, Eye, ArrowDownToLine, TrashBin } from "@gravity-ui/icons";
import {
  uploadFileToStorage,
  useFacultyProfileQuery,
  useFacultyUploadUrlMutation,
  useSaveFacultyStepMutation,
  useSubmitFacultyProfileMutation,
} from "@/app/lib/queries/faculty-profile";
import {
  GENDERS,
  FACULTY_ADDRESS_KINDS,
  validateFacultyStep1,
  validateFacultyStep2,
  validateFacultyStep3,
  validateFacultyStep4,
  type FacultyContactInfoData,
  type FacultyDocumentsData,
  type FacultyPersonalInfoData,
  type FacultyProfessionalInfoData,
  type ValidationError,
} from "@/app/lib/validations/faculty-profile";

const STEPS = [
  { id: 1, title: "Personal Info", description: "Basic details" },
  { id: 2, title: "Contact Info", description: "Phone and address" },
  { id: 3, title: "Professional Info", description: "Experience and role info" },
  { id: 4, title: "Profile Photo", description: "Upload required photo" },
  { id: 5, title: "Review & Save", description: "Verify and complete" },
] as const;

const MAX_FILE_SIZE = 100 * 1024;

function getFieldError(errors: ValidationError[], field: string) {
  return errors.find((e) => e.field === field)?.message;
}

export function FacultyProfileStepper() {
  const { data: profile, isLoading, error } = useFacultyProfileQuery();
  const saveStepMutation = useSaveFacultyStepMutation();
  const submitMutation = useSubmitFacultyProfileMutation();
  const uploadUrlMutation = useFacultyUploadUrlMutation();

  const [activeStep, setActiveStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Track the highest step the user has reached locally (not just server state)
  const [highestStepReached, setHighestStepReached] = useState(1);
  // Prevent useEffect from resetting step after mutations
  const initializedRef = useRef(false);

  const [personal, setPersonal] = useState<FacultyPersonalInfoData>({
    fullName: "",
    dob: "",
    gender: "",
  });
  const [contact, setContact] = useState<FacultyContactInfoData>({
    mobile: "",
    alternateMobile: "",
    address: { line1: "", city: "", pincode: "", kind: "home" },
  });
  const [professional, setProfessional] = useState<FacultyProfessionalInfoData>({
    qualification: "",
    experienceYears: "",
    specialization: "",
    designation: "",
  });
  const [documents, setDocuments] = useState<FacultyDocumentsData>({
    profilePhotoUrl: undefined,
  });

  const isComplete = profile?.profileCompletion === "complete";
  // Compute progress from local validation state so it updates immediately
  const stepsCompleted = useMemo(() => {
    let count = 0;
    if (validateFacultyStep1(personal).valid) count++;
    if (validateFacultyStep2(contact).valid) count++;
    if (validateFacultyStep3(professional).valid) count++;
    if (validateFacultyStep4(documents).valid) count++;
    return count;
  }, [personal, contact, professional, documents]);
  const progressPercent = isComplete ? 100 : Math.round((stepsCompleted / 4) * 100);

  // Hydrate local state from server data ONLY on initial load.
  // After initialization, local state is authoritative (prevents step-jump bugs).
  useEffect(() => {
    if (!profile) return;
    // Always sync form field values from latest server data
    setPersonal({
      fullName: profile.fullName ?? "",
      dob: profile.dob ?? "",
      gender: profile.gender ?? "",
    });
    setContact({
      mobile: profile.mobile ?? "",
      alternateMobile: profile.alternateMobile ?? "",
      address: profile.address
        ? {
            line1: profile.address.line1,
            city: profile.address.city,
            pincode: profile.address.pincode,
            kind: profile.address.kind,
          }
        : { line1: "", city: "", pincode: "", kind: "home" },
    });
    setProfessional({
      qualification: profile.qualification ?? "",
      experienceYears: profile.experienceYears ?? "",
      specialization: profile.specialization ?? "",
      designation: profile.designation ?? "",
    });
    setDocuments({
      profilePhotoUrl: profile.profilePhotoUrl ?? undefined,
    });

    // Only set activeStep on FIRST load — never after mutations
    if (!initializedRef.current) {
      initializedRef.current = true;
      const serverStep = profile.profileCompletion === "complete"
        ? 5
        : Math.min(Math.max(profile.profileStep, 1), 5);
      setActiveStep(serverStep);
      setHighestStepReached(Math.max(serverStep, profile.profileStep ?? 1));
    } else {
      // On subsequent refetches, only advance highestStepReached if server is ahead
      setHighestStepReached((prev) => Math.max(prev, profile.profileStep ?? 1));
    }
  }, [profile]);

  const goPrev = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  }, []);
  const goNext = useCallback(() => {
    setActiveStep((prev) => Math.min(prev + 1, 5));
  }, []);
  const goToStep = useCallback((step: number) => {
    setActiveStep(step);
  }, []);

  const handleSaveStep = useCallback(
    async (step: number, data: Record<string, unknown>) => {
      setServerError(null);
      setErrors([]);
      const result = await saveStepMutation.mutateAsync({ step, data });
      // Advance highestStepReached so the next step becomes clickable
      setHighestStepReached((prev) => Math.max(prev, result.profileStep));
      goNext();
    },
    [goNext, saveStepMutation]
  );

  const handleUploadPhoto = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setServerError("File exceeds maximum size of 100KB");
        return;
      }
      setServerError(null);
      setUploadingPhoto(true);
      try {
        const { uploadUrl, fileKey } = await uploadUrlMutation.mutateAsync({
          docType: "profile_photo",
          contentType: file.type,
          fileSize: file.size,
        });
        await uploadFileToStorage(file, uploadUrl);
        setDocuments({ profilePhotoUrl: fileKey });
        toast.success("Photo uploaded");
      } catch (err) {
        setServerError((err as Error).message);
      } finally {
        setUploadingPhoto(false);
      }
    },
    [uploadUrlMutation]
  );

  const reviewValidations = useMemo(() => {
    const v1 = validateFacultyStep1(personal);
    const v2 = validateFacultyStep2(contact);
    const v3 = validateFacultyStep3(professional);
    const v4 = validateFacultyStep4(documents);
    return { v1, v2, v3, v4, allValid: v1.valid && v2.valid && v3.valid && v4.valid };
  }, [personal, contact, professional, documents]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading faculty profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load profile</Alert.Title>
            <Alert.Description>
              {error instanceof Error
                ? error.message
                : "Something went wrong. Please refresh the page."}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {serverError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{serverError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isComplete ? "Your Faculty Profile" : "Complete Your Faculty Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Direct-save profile flow. No approval is required.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Progress</span>
          <span className="font-semibold text-accent">{progressPercent}%</span>
        </div>
        <ProgressBar value={progressPercent} aria-label="Faculty profile completion progress">
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step) => {
          const isCurrent = step.id === activeStep;
          const isDone = isComplete || step.id < activeStep;
          const isClickable = isComplete || step.id <= highestStepReached;

          return (
            <button
              key={step.id}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && goToStep(step.id)}
              className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                isCurrent
                  ? "border-accent bg-accent/10 text-accent shadow-sm"
                  : isDone
                  ? "border-success/30 bg-success/5 text-success"
                  : isClickable
                  ? "border-divider bg-background text-muted-foreground hover:border-accent/40 hover:bg-accent/5"
                  : "border-divider/50 bg-background/50 text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent
                    ? "bg-accent text-accent-foreground"
                    : isDone
                    ? "bg-success text-white"
                    : "bg-default/20 text-muted-foreground"
                }`}
              >
                {isDone && !isCurrent ? <Check className="size-3.5" /> : step.id}
              </span>
              <span className="hidden font-medium sm:inline">{step.title}</span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden border border-divider bg-background shadow-sm">
        <Card.Header className="border-b border-divider bg-default/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
              {activeStep}
            </span>
            <div>
              <Card.Title className="text-base font-semibold">
                {STEPS[activeStep - 1].title}
              </Card.Title>
              <Card.Description className="text-xs text-muted-foreground">
                {STEPS[activeStep - 1].description}
              </Card.Description>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="p-6">
          {activeStep === 1 && (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const validation = validateFacultyStep1(personal);
                setErrors(validation.errors);
                if (!validation.valid) return;
                try {
                  await handleSaveStep(1, personal as unknown as Record<string, unknown>);
                } catch (err) {
                  setServerError((err as Error).message);
                }
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField
                    isRequired
                    isInvalid={!!getFieldError(errors, "fullName")}
                    value={personal.fullName}
                    onChange={(v) => setPersonal((p) => ({ ...p, fullName: v }))}
                  >
                    <Label>Full Name</Label>
                    <Input />
                    {getFieldError(errors, "fullName") && (
                      <FieldError>{getFieldError(errors, "fullName")}</FieldError>
                    )}
                  </TextField>
                </div>
                <TextField
                  isRequired
                  type="date"
                  isInvalid={!!getFieldError(errors, "dob")}
                  value={personal.dob}
                  onChange={(v) => setPersonal((p) => ({ ...p, dob: v }))}
                >
                  <Label>Date of Birth</Label>
                  <Input />
                  {getFieldError(errors, "dob") && (
                    <FieldError>{getFieldError(errors, "dob")}</FieldError>
                  )}
                </TextField>
                <Select
                  isRequired
                  isInvalid={!!getFieldError(errors, "gender")}
                  value={personal.gender || null}
                  onChange={(key: Key | null) =>
                    setPersonal((p) => ({ ...p, gender: String(key ?? "") }))
                  }
                >
                  <Label>Gender</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {GENDERS.map((g) => (
                        <ListBox.Item key={g} id={g}>
                          <span className="capitalize">{g}</span>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                  {getFieldError(errors, "gender") && (
                    <FieldError>{getFieldError(errors, "gender")}</FieldError>
                  )}
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  isPending={saveStepMutation.isPending}
                  isDisabled={saveStepMutation.isPending}
                >
                  Save & Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          )}

          {activeStep === 2 && (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const validation = validateFacultyStep2(contact);
                setErrors(validation.errors);
                if (!validation.valid) return;
                try {
                  await handleSaveStep(2, contact as unknown as Record<string, unknown>);
                } catch (err) {
                  setServerError((err as Error).message);
                }
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  isRequired
                  isInvalid={!!getFieldError(errors, "mobile")}
                  value={contact.mobile ?? ""}
                  onChange={(v) => setContact((p) => ({ ...p, mobile: v }))}
                >
                  <Label>Mobile</Label>
                  <Input />
                  {getFieldError(errors, "mobile") && (
                    <FieldError>{getFieldError(errors, "mobile")}</FieldError>
                  )}
                </TextField>
                <TextField
                  isInvalid={!!getFieldError(errors, "alternateMobile")}
                  value={contact.alternateMobile ?? ""}
                  onChange={(v) => setContact((p) => ({ ...p, alternateMobile: v }))}
                >
                  <Label>Alternate Mobile</Label>
                  <Input />
                  {getFieldError(errors, "alternateMobile") && (
                    <FieldError>{getFieldError(errors, "alternateMobile")}</FieldError>
                  )}
                </TextField>

                {/* Address kind */}
                <div className="sm:col-span-2">
                  <Select
                    value={(contact.address as { kind?: string })?.kind ?? null}
                    onChange={(key: Key | null) =>
                      setContact((p) => ({
                        ...p,
                        address: {
                          line1: (p.address as { line1?: string })?.line1 ?? "",
                          city: (p.address as { city?: string })?.city ?? "",
                          pincode: (p.address as { pincode?: string })?.pincode ?? "",
                          kind: String(key ?? "home") as "home" | "other",
                        },
                      }))
                    }
                  >
                    <Label>Address Type</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {FACULTY_ADDRESS_KINDS.map((k) => (
                          <ListBox.Item key={k} id={k}>
                            <span className="capitalize">{k === "home" ? "Home" : "Other"}</span>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                    {getFieldError(errors, "address.kind") && (
                      <FieldError>{getFieldError(errors, "address.kind")}</FieldError>
                    )}
                  </Select>
                </div>

                {/* Address line 1 */}
                <div className="sm:col-span-2">
                  <TextField
                    isInvalid={!!getFieldError(errors, "address.line1")}
                    value={(contact.address as { line1?: string })?.line1 ?? ""}
                    onChange={(v) =>
                      setContact((p) => ({
                        ...p,
                        address: {
                          line1: v,
                          city: (p.address as { city?: string })?.city ?? "",
                          pincode: (p.address as { pincode?: string })?.pincode ?? "",
                          kind: ((p.address as { kind?: string })?.kind ?? "home") as "home" | "other",
                        },
                      }))
                    }
                  >
                    <Label>Address Line 1</Label>
                    <Input placeholder="Building / street / locality" />
                    {getFieldError(errors, "address.line1") && (
                      <FieldError>{getFieldError(errors, "address.line1")}</FieldError>
                    )}
                  </TextField>
                </div>

                {/* City */}
                <TextField
                  isInvalid={!!getFieldError(errors, "address.city")}
                  value={(contact.address as { city?: string })?.city ?? ""}
                  onChange={(v) =>
                    setContact((p) => ({
                      ...p,
                      address: {
                        line1: (p.address as { line1?: string })?.line1 ?? "",
                        city: v,
                        pincode: (p.address as { pincode?: string })?.pincode ?? "",
                        kind: ((p.address as { kind?: string })?.kind ?? "home") as "home" | "other",
                      },
                    }))
                  }
                >
                  <Label>City</Label>
                  <Input placeholder="e.g. Ahmedabad" />
                  {getFieldError(errors, "address.city") && (
                    <FieldError>{getFieldError(errors, "address.city")}</FieldError>
                  )}
                </TextField>

                {/* Pincode */}
                <TextField
                  isInvalid={!!getFieldError(errors, "address.pincode")}
                  value={(contact.address as { pincode?: string })?.pincode ?? ""}
                  onChange={(v) =>
                    setContact((p) => ({
                      ...p,
                      address: {
                        line1: (p.address as { line1?: string })?.line1 ?? "",
                        city: (p.address as { city?: string })?.city ?? "",
                        pincode: v.replace(/\D/g, "").slice(0, 6),
                        kind: ((p.address as { kind?: string })?.kind ?? "home") as "home" | "other",
                      },
                    }))
                  }
                >
                  <Label>Pincode</Label>
                  <Input placeholder="6-digit pincode" maxLength={6} inputMode="numeric" />
                  {getFieldError(errors, "address.pincode") && (
                    <FieldError>{getFieldError(errors, "address.pincode")}</FieldError>
                  )}
                </TextField>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  isPending={saveStepMutation.isPending}
                  isDisabled={saveStepMutation.isPending}
                >
                  Save & Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          )}

          {activeStep === 3 && (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const validation = validateFacultyStep3(professional);
                setErrors(validation.errors);
                if (!validation.valid) return;
                try {
                  await handleSaveStep(3, professional as unknown as Record<string, unknown>);
                } catch (err) {
                  setServerError((err as Error).message);
                }
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  isRequired
                  isInvalid={!!getFieldError(errors, "qualification")}
                  value={professional.qualification}
                  onChange={(v) =>
                    setProfessional((p) => ({ ...p, qualification: v }))
                  }
                >
                  <Label>Qualification</Label>
                  <Input />
                  {getFieldError(errors, "qualification") && (
                    <FieldError>{getFieldError(errors, "qualification")}</FieldError>
                  )}
                </TextField>
                <TextField
                  isRequired
                  type="number"
                  isInvalid={!!getFieldError(errors, "experienceYears")}
                  value={String(professional.experienceYears)}
                  onChange={(v) =>
                    setProfessional((p) => ({ ...p, experienceYears: v }))
                  }
                >
                  <Label>Experience (Years)</Label>
                  <Input />
                  {getFieldError(errors, "experienceYears") && (
                    <FieldError>{getFieldError(errors, "experienceYears")}</FieldError>
                  )}
                </TextField>
                <TextField
                  isRequired
                  isInvalid={!!getFieldError(errors, "specialization")}
                  value={professional.specialization}
                  onChange={(v) =>
                    setProfessional((p) => ({ ...p, specialization: v }))
                  }
                >
                  <Label>Specialization</Label>
                  <Input />
                  {getFieldError(errors, "specialization") && (
                    <FieldError>{getFieldError(errors, "specialization")}</FieldError>
                  )}
                </TextField>
                <TextField
                  isRequired
                  isInvalid={!!getFieldError(errors, "designation")}
                  value={professional.designation}
                  onChange={(v) => setProfessional((p) => ({ ...p, designation: v }))}
                >
                  <Label>Designation</Label>
                  <Input />
                  {getFieldError(errors, "designation") && (
                    <FieldError>{getFieldError(errors, "designation")}</FieldError>
                  )}
                </TextField>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  isPending={saveStepMutation.isPending}
                  isDisabled={saveStepMutation.isPending}
                >
                  Save & Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          )}

          {activeStep === 4 && (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const validation = validateFacultyStep4(documents);
                setErrors(validation.errors);
                if (!validation.valid) return;
                try {
                  await handleSaveStep(4, documents as unknown as Record<string, unknown>);
                } catch (err) {
                  setServerError((err as Error).message);
                }
              }}
            >
              <Alert status="accent">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    Profile photo is required. Max size: <strong>100KB</strong>. Allowed: JPEG, PNG, WebP.
                  </Alert.Description>
                </Alert.Content>
              </Alert>

              <div
                className={`
                  relative rounded-xl border-2 border-dashed p-4 transition-all duration-200
                  ${getFieldError(errors, "profilePhotoUrl")
                    ? "border-danger bg-danger/5"
                    : documents.profilePhotoUrl
                      ? "border-success/40 bg-success/5"
                      : "border-divider hover:border-accent/40 hover:bg-accent/5"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                      ${documents.profilePhotoUrl ? "bg-success/10 text-success" : "bg-default/10 text-muted-foreground"}
                    `}
                  >
                    {documents.profilePhotoUrl ? (
                      <CircleCheck className="size-5" />
                    ) : (
                      <Picture className="size-5" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Profile Photo</p>
                      <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-danger">
                        Required
                      </span>
                    </div>

                    {documents.profilePhotoUrl ? (
                      <div className="space-y-3 pt-1">
                        {/* Preview Media Container */}
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-success/30 shadow-sm bg-muted">
                            <img
                              src={`/api/student/profile-photo?key=${encodeURIComponent(documents.profilePhotoUrl)}`}
                              alt="Profile Photo"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-success">
                              ✓ Uploaded successfully
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground" title={documents.profilePhotoUrl}>
                              {documents.profilePhotoUrl.split("/").pop()}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons Group */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* View Preview Button */}
                          <a
                            href={`/api/student/profile-photo?key=${encodeURIComponent(documents.profilePhotoUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-divider bg-content1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-default/10 hover:text-foreground transition-all duration-200"
                            title="Open profile photo in a new tab to preview"
                          >
                            <Eye className="size-3.5" />
                            <span>Preview</span>
                          </a>

                          {/* Download Button */}
                          <a
                            href={`/api/student/profile-photo?key=${encodeURIComponent(documents.profilePhotoUrl)}&download=true`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-divider bg-content1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-default/10 hover:text-foreground transition-all duration-200"
                            title="Download profile photo to your device"
                          >
                            <ArrowDownToLine className="size-3.5" />
                            <span>Download</span>
                          </a>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => setDocuments({ profilePhotoUrl: undefined })}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-all duration-200"
                            title="Remove this photo"
                          >
                            <TrashBin className="size-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : uploadingPhoto ? (
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" />
                        <span className="text-xs text-muted-foreground">Uploading…</span>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-accent hover:underline">
                        Choose file
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleUploadPhoto(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}

                    {getFieldError(errors, "profilePhotoUrl") && (
                      <p className="text-xs text-danger">
                        {getFieldError(errors, "profilePhotoUrl")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isPending={saveStepMutation.isPending}
                  isDisabled={saveStepMutation.isPending || uploadingPhoto}
                >
                  Save & Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          )}

          {activeStep === 5 && (
            <div className="space-y-6">
              {!reviewValidations.allValid && !isComplete && (
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Incomplete Information</Alert.Title>
                    <Alert.Description>
                      Some required fields are missing. Please complete all steps before final save.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
              {isComplete && (
                <Alert status="success">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Profile Complete</Alert.Title>
                    <Alert.Description>
                      Your faculty profile is complete. Any future edits save directly.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ReviewField label="Name" value={personal.fullName} />
                <ReviewField label="DOB" value={personal.dob} />
                <ReviewField label="Gender" value={personal.gender} />
                <ReviewField label="Email" value={profile.email} />
                <ReviewField label="Mobile" value={contact.mobile} />
                <ReviewField label="Alt Mobile" value={contact.alternateMobile} />
                <ReviewField
                  label="Address"
                  value={
                    contact.address && typeof contact.address === "object"
                      ? `${contact.address.line1}, ${contact.address.city} - ${contact.address.pincode}`
                      : null
                  }
                />
                <ReviewField label="Qualification" value={professional.qualification} />
                <ReviewField label="Experience" value={`${professional.experienceYears} years`} />
                <ReviewField label="Specialization" value={professional.specialization} />
                <ReviewField label="Designation" value={professional.designation} />
                <div>
                  <p className="text-xs text-muted-foreground">Profile Photo</p>
                  {documents.profilePhotoUrl ? (
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-success/30 shadow-sm bg-muted">
                        <img
                          src={`/api/student/profile-photo?key=${encodeURIComponent(documents.profilePhotoUrl)}`}
                          alt="Profile Photo"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <a
                          href={`/api/student/profile-photo?key=${encodeURIComponent(documents.profilePhotoUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                        >
                          <Eye className="size-3" />
                          <span>Preview</span>
                        </a>
                        <a
                          href={`/api/student/profile-photo?key=${encodeURIComponent(documents.profilePhotoUrl)}&download=true`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <ArrowDownToLine className="size-3" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-danger">Missing</p>
                  )}
                </div>
              </div>

              {!isComplete && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button
                      isPending={submitMutation.isPending}
                      isDisabled={!reviewValidations.allValid || submitMutation.isPending}
                      onPress={async () => {
                        setServerError(null);
                        try {
                          await submitMutation.mutateAsync();
                          toast.success("Profile saved successfully");
                        } catch (err) {
                          setServerError((err as Error).message);
                        }
                      }}
                    >
                      Complete Profile
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card.Content>

        <Card.Footer className="flex items-center justify-between border-t border-divider bg-default/5 px-6 py-3">
          <Button
            variant="secondary"
            size="sm"
            isDisabled={activeStep === 1}
            onPress={goPrev}
          >
            <ArrowLeft className="size-4" />
            Previous
          </Button>
          {activeStep < 5 ? (
            <div className="text-xs text-muted-foreground">Step {activeStep} of 5</div>
          ) : isComplete ? (
            <div className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CircleCheck className="size-4" />
              Profile Complete
            </div>
          ) : (
            <div />
          )}
          {activeStep >= 5 ? <div /> : <div />}
        </Card.Footer>
      </Card>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
