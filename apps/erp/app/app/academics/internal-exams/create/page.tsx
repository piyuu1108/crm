"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Spinner, Alert, Chip, toast } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  FileText,
  Target,
  ShieldCheck,
  BookOpen,
  CalendarDays,
  Building2,
  ClipboardCheck,
} from "lucide-react";
import {
  useExamWizardDetailQuery,
  useCreateDraftMutation,
} from "@/app/lib/queries/exam-wizard";
import { Step1BasicDetails } from "./components/step1-basic-details";
import { Step2TargetScope } from "./components/step2-target-scope";
import { Step3Eligibility } from "./components/step3-eligibility";
import { Step4Subjects } from "./components/step4-subjects";
import { Step5Schedule } from "./components/step5-schedule";
import { Step6Halls } from "./components/step6-halls";
import { Step7Review } from "./components/step7-review";

const STEPS = [
  { label: "Basic Details", icon: FileText },
  { label: "Target Scope", icon: Target },
  { label: "Eligibility", icon: ShieldCheck },
  { label: "Subjects", icon: BookOpen },
  { label: "Schedule", icon: CalendarDays },
  { label: "Hall Allocation", icon: Building2 },
  { label: "Review & Publish", icon: ClipboardCheck },
];

export default function CreateExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get("examId");
  const stepParam = searchParams.get("step");

  const [examId, setExamId] = useState<number>(examIdParam ? parseInt(examIdParam) : 0);
  const [currentStep, setCurrentStep] = useState(stepParam ? parseInt(stepParam) : 1);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data: examData, isLoading, error, refetch } = useExamWizardDetailQuery(examId);
  const createMutation = useCreateDraftMutation();

  // Sync URL params with state
  useEffect(() => {
    if (examId > 0) {
      const url = new URL(window.location.href);
      url.searchParams.set("examId", String(examId));
      url.searchParams.set("step", String(currentStep));
      window.history.replaceState({}, "", url.toString());
    }
  }, [examId, currentStep]);

  // Jump to last completed step + 1 on initial load
  useEffect(() => {
    if (examData?.exam && !stepParam) {
      const next = Math.min((examData.exam.completedStep || 0) + 1, 7);
      setCurrentStep(next);
    }
  }, [examData?.exam?.completedStep]);

  const handleStepSaved = useCallback(() => {
    setSaveStatus("saved");
    refetch();
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [refetch]);

  const handleSaveError = useCallback(() => {
    setSaveStatus("error");
    setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  const handleSaving = useCallback(() => {
    setSaveStatus("saving");
  }, []);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 7));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const canNavigateTo = (step: number) => {
    if (!examData?.exam) return step === 1;
    return step <= (examData.exam.completedStep || 0) + 1;
  };

  // Step 1 creates the draft if examId is 0
  const handleDraftCreated = useCallback((id: number) => {
    setExamId(id);
    setCurrentStep(2);
    toast.success("Draft created", { description: "Exam draft saved. Continue setting up." });
  }, []);

  // Render step content
  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <Step1BasicDetails
          examId={examId}
          examData={examData?.exam || null}
          onDraftCreated={handleDraftCreated}
          onSaved={handleStepSaved}
          onSaving={handleSaving}
          onError={handleSaveError}
        />
      );
    }

    if (!examData || examId === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Complete Step 1 first to continue.</p>
        </Card>
      );
    }

    switch (currentStep) {
      case 2:
        return (
          <Step2TargetScope
            examId={examId}
            scopes={examData.scopes}
            onSaved={handleStepSaved}
            onSaving={handleSaving}
            onError={handleSaveError}
          />
        );
      case 3:
        return (
          <Step3Eligibility
            examId={examId}
            scopes={examData.scopes}
            rules={examData.eligibility}
            onSaved={handleStepSaved}
            onSaving={handleSaving}
            onError={handleSaveError}
          />
        );
      case 4:
        return (
          <Step4Subjects
            examId={examId}
            scopes={examData.scopes}
            subjects={examData.subjects}
            onSaved={handleStepSaved}
            onSaving={handleSaving}
            onError={handleSaveError}
          />
        );
      case 5:
        return (
          <Step5Schedule
            examId={examId}
            subjects={examData.subjects}
            schedules={examData.schedules}
            onSaved={handleStepSaved}
            onSaving={handleSaving}
            onError={handleSaveError}
          />
        );
      case 6:
        return (
          <Step6Halls
            examId={examId}
            halls={examData.halls}
            summary={examData.summary}
            onSaved={handleStepSaved}
            onSaving={handleSaving}
            onError={handleSaveError}
          />
        );
      case 7:
        return (
          <Step7Review
            examId={examId}
            examData={examData}
            onSaved={handleStepSaved}
            onSaving={handleSaving}
            onError={handleSaveError}
          />
        );
      default:
        return null;
    }
  };

  if (examId > 0 && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="tertiary"
          isIconOnly
          aria-label="Back"
          onPress={() => router.push("/app/academics/internal-exams")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {examId > 0 ? "Edit Examination" : "Create Examination"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {examId > 0 && examData?.exam
              ? `${examData.exam.examName} — ${examData.exam.examType.toUpperCase()}`
              : "Follow the guided workflow to set up an internal examination."}
          </p>
        </div>

        {/* Save Status Indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <Chip variant="tertiary" size="sm" className="text-xs">
              <Spinner size="sm" className="mr-1" /> Saving…
            </Chip>
          )}
          {saveStatus === "saved" && (
            <Chip color="success" variant="tertiary" size="sm" className="text-xs">
              <Check className="size-3 mr-1" /> Saved
            </Chip>
          )}
          {saveStatus === "error" && (
            <Chip color="danger" variant="tertiary" size="sm" className="text-xs">
              Save Failed
            </Chip>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = currentStep === stepNum;
          const isCompleted = examData?.exam
            ? (examData.exam.completedStep || 0) >= stepNum
            : false;
          const isAccessible = canNavigateTo(stepNum);
          const Icon = step.icon;

          return (
            <React.Fragment key={stepNum}>
              {i > 0 && (
                <div
                  className={`hidden sm:block h-px flex-1 min-w-4 max-w-12 ${
                    isCompleted ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
              <button
                onClick={() => isAccessible && setCurrentStep(stepNum)}
                disabled={!isAccessible}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-accent text-white shadow-sm"
                    : isCompleted
                    ? "bg-accent/10 text-accent hover:bg-accent/20"
                    : isAccessible
                    ? "bg-surface text-muted-foreground hover:bg-default-100"
                    : "bg-surface text-default-300 cursor-not-allowed opacity-50"
                }`}
              >
                <div className="flex items-center justify-center size-6 rounded-full text-xs font-bold">
                  {isCompleted && !isActive ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </div>
                <span className="hidden md:inline">{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error Loading Exam</Alert.Title>
            <Alert.Description>{(error as Error).message}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStep()}</div>

      {/* Bottom Navigation */}
      {examId > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="secondary"
            onPress={goPrev}
            isDisabled={currentStep === 1}
          >
            <ArrowLeft className="size-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </span>

          {currentStep < 7 ? (
            <Button
              variant="primary"
              onPress={goNext}
              isDisabled={!canNavigateTo(currentStep + 1)}
            >
              Next
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
