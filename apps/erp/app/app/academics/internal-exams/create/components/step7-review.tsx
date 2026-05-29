"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Chip,
  Spinner,
  AlertDialog,
  toast,
} from "@heroui/react";
import {
  Check,
  AlertTriangle,
  FileText,
  Target,
  ShieldCheck,
  BookOpen,
  CalendarDays,
  Building2,
  Users,
  Clock,
  Send,
} from "lucide-react";
import { usePublishExamMutation, type ExamDraftDetail } from "@/app/lib/queries/exam-wizard";

interface Step7Props {
  examId: number;
  examData: ExamDraftDetail;
  onSaved: () => void;
  onSaving: () => void;
  onError: () => void;
}

const YEAR_NAMES: Record<number, string> = {
  1: "FY", 2: "SY", 3: "TY", 4: "Fourth", 5: "Fifth", 6: "Sixth",
};

export function Step7Review({ examId, examData, onSaved, onSaving, onError }: Step7Props) {
  const router = useRouter();
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const publishMutation = usePublishExamMutation(examId);

  const { exam, scopes, eligibility, subjects, schedules, halls, summary } = examData;

  // Check completeness
  const checks = [
    { label: "Basic Details", ok: !!exam.examName && exam.completedStep >= 1, icon: FileText },
    { label: "Target Scope", ok: scopes.length > 0, icon: Target },
    { label: "Eligibility Rules", ok: eligibility.length > 0, icon: ShieldCheck },
    { label: "Subjects Selected", ok: subjects.length > 0, icon: BookOpen },
    { label: "Schedule Planned", ok: schedules.length > 0, icon: CalendarDays },
    { label: "Halls Allocated", ok: halls.length > 0, icon: Building2 },
  ];

  const allComplete = checks.every((c) => c.ok);
  const totalCapacity = halls.reduce((sum, h) => sum + h.benchCapacity, 0);

  const handlePublish = async () => {
    onSaving();
    try {
      await publishMutation.mutateAsync();
      toast.success("Exam Published!", {
        description: `${exam.examName} is now active and scheduled.`,
      });
      onSaved();
      router.push("/app/academics/internal-exams");
    } catch (err) {
      onError();
      const error = err as Error & { errors?: string[] };
      toast.danger("Failed to publish", {
        description: error.errors?.join(", ") || error.message || "Something went wrong",
      });
    }
    setShowPublishDialog(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Readiness Checklist */}
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-divider/20">
          <h2 className="text-lg font-semibold text-foreground">Publish Readiness</h2>
          <p className="text-sm text-default-500 mt-0.5">All items must be complete before publishing.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checks.map((check) => {
              const Icon = check.icon;
              return (
                <div
                  key={check.label}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                    check.ok
                      ? "border-success/30 bg-success/5"
                      : "border-danger/30 bg-danger/5"
                  }`}
                >
                  <div className={`flex items-center justify-center size-8 rounded-lg ${
                    check.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  }`}>
                    {check.ok ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{check.label}</p>
                    <p className={`text-xs ${check.ok ? "text-success" : "text-danger"}`}>
                      {check.ok ? "Complete" : "Incomplete"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Exam Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Basic Info */}
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-divider/20 flex items-center gap-2">
            <FileText className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Exam Details</h3>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-xs text-default-500">Name</span>
              <span className="text-sm font-medium text-foreground">{exam.examName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-default-500">Type</span>
              <Chip size="sm" variant="tertiary" color="accent">{exam.examType.toUpperCase()}</Chip>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-default-500">Exam #</span>
              <span className="text-sm font-medium text-foreground">{exam.examNumber}</span>
            </div>
            {exam.description && (
              <div>
                <span className="text-xs text-default-500 block mb-1">Description</span>
                <p className="text-xs text-foreground bg-default-50 p-2 rounded-lg">{exam.description}</p>
              </div>
            )}
          </div>
        </Card>

        {/* KPI Summary */}
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-divider/20 flex items-center gap-2">
            <Target className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Statistics</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Users className="size-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{summary.totalStudents}</p>
                <p className="text-[10px] text-default-500">Students</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-default-100 text-default-500 flex items-center justify-center">
                <Target className="size-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{summary.divisionCount}</p>
                <p className="text-[10px] text-default-500">Divisions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-default-100 text-default-500 flex items-center justify-center">
                <BookOpen className="size-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{summary.subjectCount}</p>
                <p className="text-[10px] text-default-500">Subjects</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-default-100 text-default-500 flex items-center justify-center">
                <Building2 className="size-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{totalCapacity}</p>
                <p className="text-[10px] text-default-500">Total Seats</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Scope + Eligibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-divider/20">
            <h3 className="text-sm font-semibold text-foreground">Divisions</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {scopes.map((s) => (
              <Chip key={s.id} variant="tertiary" size="sm">
                {s.displayName} ({s.studentCount})
              </Chip>
            ))}
            {scopes.length === 0 && <p className="text-xs text-default-400">None selected</p>}
          </div>
        </Card>

        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-divider/20">
            <h3 className="text-sm font-semibold text-foreground">Eligibility Rules</h3>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {eligibility.map((r) => (
              <div key={r.id} className="flex justify-between items-center text-sm">
                <span className="text-default-600">{YEAR_NAMES[r.yearLabel] || `Y${r.yearLabel}`}</span>
                <div className="flex gap-2 items-center">
                  <Chip size="sm" variant="tertiary" color="accent">≥ {r.minAttendancePercent}%</Chip>
                  {r.allowApprovalOverride && <Chip size="sm" variant="tertiary" color="warning">Override</Chip>}
                </div>
              </div>
            ))}
            {eligibility.length === 0 && <p className="text-xs text-default-400">No rules defined</p>}
          </div>
        </Card>
      </div>

      {/* Schedule + Halls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-divider/20">
            <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {schedules.map((sch) => {
              const sub = subjects.find((s) => s.id === sch.examSubjectId);
              return (
                <div key={sch.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-default-50/50">
                  <span className="font-medium text-foreground truncate flex-1">{sub?.subjectName || "—"}</span>
                  <div className="flex items-center gap-2 text-default-500 text-xs shrink-0">
                    <CalendarDays className="size-3" />
                    <span>{sch.examDate}</span>
                    <Clock className="size-3 ml-1" />
                    <span>{sch.startTime}–{sch.endTime}</span>
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && <p className="text-xs text-default-400">No schedule</p>}
          </div>
        </Card>

        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-divider/20">
            <h3 className="text-sm font-semibold text-foreground">Hall Allocation</h3>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {halls.map((h, i) => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs font-bold text-accent w-4">{i + 1}</span>
                <span className="font-medium text-foreground">{h.roomCode}</span>
                <span className="text-xs text-default-400 flex-1">{h.floor}</span>
                <Chip size="sm" variant="tertiary">{h.benchCapacity} seats</Chip>
              </div>
            ))}
            {halls.length === 0 && <p className="text-xs text-default-400">No halls</p>}
          </div>
        </Card>
      </div>

      {/* Publish Button */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onPress={() => setShowPublishDialog(true)}
          isDisabled={!allComplete}
          className={allComplete ? "bg-success text-white hover:bg-success/90" : ""}
        >
          <Send className="size-4" />
          Publish Examination
        </Button>
      </div>

      {/* Publish Confirmation */}
      <AlertDialog.Backdrop isOpen={showPublishDialog} onOpenChange={setShowPublishDialog} variant="blur">
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>Publish Examination?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-default-600">
                Publishing <strong>{exam.examName}</strong> will make it active and visible. 
                This will notify faculty and begin the examination process for{" "}
                <strong>{summary.totalStudents}</strong> students across{" "}
                <strong>{summary.divisionCount}</strong> divisions.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={publishMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handlePublish}
                isPending={publishMutation.isPending}
              >
                {({ isPending: p }) => (
                  <>
                    {p && <Spinner color="current" size="sm" />}
                    Confirm Publish
                  </>
                )}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}
