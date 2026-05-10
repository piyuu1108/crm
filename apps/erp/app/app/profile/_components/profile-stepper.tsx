"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  ProgressBar,
  Alert,
  Spinner,
} from "@heroui/react";
import {
  ArrowLeft,
  Check,
  CircleCheck,
} from "@gravity-ui/icons";
import { useProfileQuery } from "@/app/lib/queries/profile";
import { StepPersonal } from "./step-personal";
import { StepContact } from "./step-contact";
import { StepAcademic } from "./step-academic";
import { StepDocuments } from "./step-documents";
import { StepReview } from "./step-review";

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Personal Info", description: "Basic personal details" },
  { id: 2, title: "Contact Info", description: "Phone, address, Aadhaar" },
  { id: 3, title: "Academic Info", description: "Education background" },
  { id: 4, title: "Documents", description: "Upload certificates" },
  { id: 5, title: "Review & Submit", description: "Verify and finalize" },
] as const;

function isProfileCompleted(profileStatus: string | null | undefined) {
  return profileStatus === "complete" || profileStatus === "completed";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProfileStepper() {
  const { data: profile, isLoading, error } = useProfileQuery();
  const [activeStep, setActiveStep] = useState(1);
  const [stepSaving, setStepSaving] = useState(false);

  // Resume from saved step
  useEffect(() => {
    if (profile?.profileStep) {
      // If already complete, show review step
      if (isProfileCompleted(profile.profileStatus)) {
        setActiveStep(5);
      } else {
        // Resume from saved step (clamped 1-5)
        setActiveStep(Math.min(profile.profileStep, 5));
      }
    }
  }, [profile?.profileStep, profile?.profileStatus]);

  const isComplete = isProfileCompleted(profile?.profileStatus);
  const safeProfileStep = Math.min(Math.max(profile?.profileStep ?? 1, 1), 5);
  const progressPercent = isComplete ? 100 : Math.round((safeProfileStep / 5) * 100);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 5) {
      setActiveStep(step);
    }
  }, []);

  const goNext = useCallback(() => {
    setActiveStep((prev) => Math.min(prev + 1, 5));
  }, []);

  const goPrev = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // ── Loading State ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
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
              {error?.message || "Something went wrong. Please refresh the page."}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {profile.status === "rejected" && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Profile Rejected</Alert.Title>
            <Alert.Description>
              Your profile was rejected by reviewer. Update details and resubmit for verification.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {profile.status === "pending" && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Verification Pending</Alert.Title>
            <Alert.Description>
              Your profile is submitted and currently under review.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {(profile.status === "approved" || profile.status === "active") && (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Profile Approved</Alert.Title>
            <Alert.Description>
              Your profile has been approved. You can still edit anytime; updates will require re-verification.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isComplete ? "Your Profile" : "Complete Your Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isComplete
            ? "Your profile is complete. You can review or edit your information below."
            : "Fill in your details to get started with the ERP system."}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Progress</span>
          <span className="font-semibold text-accent">{progressPercent}%</span>
        </div>
        <ProgressBar
          value={progressPercent}
          aria-label="Profile completion progress"
          color="accent"
          className="w-full"
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>

      {/* Stepper Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step) => {
          const isCurrent = step.id === activeStep;
          const isDone = isComplete || step.id < activeStep;
          const isClickable = isComplete || step.id <= (profile.profileStep ?? 1);

          return (
            <button
              key={step.id}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && goToStep(step.id)}
              className={`
                group flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm
                transition-all duration-200
                ${isCurrent
                  ? "border-accent bg-accent/10 text-accent shadow-sm"
                  : isDone
                    ? "border-success/30 bg-success/5 text-success hover:bg-success/10"
                    : isClickable
                      ? "border-divider bg-background text-muted-foreground hover:border-accent/40 hover:bg-accent/5"
                      : "border-divider/50 bg-background/50 text-muted-foreground/40 cursor-not-allowed"
                }
              `}
            >
              {/* Step indicator */}
              <span
                className={`
                  flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
                  ${isCurrent
                    ? "bg-accent text-accent-foreground"
                    : isDone
                      ? "bg-success text-white"
                      : "bg-default/20 text-muted-foreground"
                  }
                `}
              >
                {isDone && !isCurrent ? (
                  <Check className="size-3.5" />
                ) : (
                  step.id
                )}
              </span>

              {/* Step text (hidden on small screens) */}
              <span className="hidden font-medium sm:inline">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content Card */}
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
            <StepPersonal
              profile={profile}
              onSaved={goNext}
              onSaving={setStepSaving}
            />
          )}
          {activeStep === 2 && (
            <StepContact
              profile={profile}
              onSaved={goNext}
              onSaving={setStepSaving}
            />
          )}
          {activeStep === 3 && (
            <StepAcademic
              profile={profile}
              onSaved={goNext}
              onSaving={setStepSaving}
            />
          )}
          {activeStep === 4 && (
            <StepDocuments
              profile={profile}
              onSaved={goNext}
              onSaving={setStepSaving}
            />
          )}
          {activeStep === 5 && (
            <StepReview profile={profile} />
          )}
        </Card.Content>

        {/* Footer Navigation */}
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

          {activeStep < 5 && (
            <div className="text-xs text-muted-foreground">
              Step {activeStep} of 5
            </div>
          )}

          {activeStep === 5 && isComplete && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CircleCheck className="size-4" />
              Profile Complete
            </div>
          )}

          {/* The "Next / Save" button is INSIDE each step component for better UX */}
          {activeStep >= 5 ? null : (
            <div /> // Spacer
          )}
        </Card.Footer>
      </Card>
    </div>
  );
}
