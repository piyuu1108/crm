"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Chip,
  Separator,
  Skeleton,
} from "@heroui/react";
import { ArrowLeft, ArrowUpFromLine } from "@gravity-ui/icons";
import {
  useSubjectDetailQuery,
  type SubjectDetailResponse,
  type StudentMarks,
} from "@/app/lib/queries/subjects";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  practical: "Practical",
  both: "Theory + Practical",
};

export default function SubjectDetailPage() {
  const params = useParams<{ subject_code: string }>();
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const code = decodeURIComponent(params.subject_code ?? "");
  const { data, isLoading, error } = useSubjectDetailQuery(code, activeRole);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 py-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl py-4">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const { role, subject, assignments, marks: studentMarks } = data;
  const hasTheory = subject.subjectType === "theory" || subject.subjectType === "both";
  const hasPractical = subject.subjectType === "practical" || subject.subjectType === "both";
  const canUploadMarks = role === "faculty" || role === "counselor" || role === "hod";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 py-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          onPress={() => router.push("/app/subjects")}
          aria-label="Back to subjects"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
            {subject.name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="rounded bg-default/10 px-2 py-0.5 text-xs font-mono font-semibold text-foreground">
              {subject.code}
            </span>
            <Chip size="sm" color={
              subject.subjectType === "theory" ? "accent" :
              subject.subjectType === "practical" ? "success" : "warning"
            }>
              {TYPE_LABELS[subject.subjectType] ?? subject.subjectType}
            </Chip>
          </div>
        </div>
        {canUploadMarks && (
          <Button variant="secondary" size="sm" isDisabled>
            <ArrowUpFromLine className="size-4" />
            Upload Marks
          </Button>
        )}
      </div>

      {/* Subject Info + Marking Scheme */}
      <Card className="overflow-hidden border border-divider bg-background shadow-sm">
        <Card.Header className="border-b border-divider bg-default/5 px-6 py-4">
          <Card.Title className="text-base font-semibold">Marking Scheme</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-5 p-6">
          {hasTheory && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                  T
                </span>
                <h3 className="text-sm font-semibold text-foreground">Theory</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <InfoCell label="Internal Max" value={subject.internalTheoryMax} />
                <InfoCell label="External Max" value={subject.externalTheoryMax} />
                <InfoCell label="Passing" value={subject.theoryPassingMarks} />
              </div>
              <p className="text-xs text-muted-foreground">
                Total Theory:{" "}
                <strong className="text-foreground">
                  {(subject.internalTheoryMax ?? 0) + (subject.externalTheoryMax ?? 0)}
                </strong>
              </p>
            </div>
          )}

          {hasTheory && hasPractical && <Separator />}

          {hasPractical && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">
                  P
                </span>
                <h3 className="text-sm font-semibold text-foreground">Practical</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <InfoCell label="Internal Max" value={subject.internalPracticalMax} />
                <InfoCell label="External Max" value={subject.externalPracticalMax} />
                <InfoCell label="Passing" value={subject.practicalPassingMarks} />
              </div>
              <p className="text-xs text-muted-foreground">
                Total Practical:{" "}
                <strong className="text-foreground">
                  {(subject.internalPracticalMax ?? 0) + (subject.externalPracticalMax ?? 0)}
                </strong>
              </p>
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between rounded-lg bg-default/10 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
            <span className="text-lg font-bold text-foreground">
              {(subject.internalTheoryMax ?? 0) +
                (subject.externalTheoryMax ?? 0) +
                (subject.internalPracticalMax ?? 0) +
                (subject.externalPracticalMax ?? 0)}
            </span>
          </div>
        </Card.Content>
      </Card>

      {/* Assignments / Divisions */}
      {assignments.length > 0 && (
        <Card className="overflow-hidden border border-divider bg-background shadow-sm">
          <Card.Header className="border-b border-divider bg-default/5 px-6 py-4">
            <Card.Title className="text-base font-semibold">
              {role === "student" ? "Your Assignment" : "Division Assignments"}
            </Card.Title>
            <Card.Description className="text-xs text-muted-foreground">
              Faculty and division mapping for the active semester
            </Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="divide-y divide-divider">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {a.facultyName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.divisionName} · {a.courseCode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Student Marks */}
      {role === "student" && (
        <StudentMarksCard
          marks={studentMarks ?? null}
          subjectType={subject.subjectType}
        />
      )}
    </div>
  );
}

// ─── Student Marks Card ───────────────────────────────────────────────────────

function StudentMarksCard({
  marks,
  subjectType,
}: {
  marks: StudentMarks | null;
  subjectType: string;
}) {
  const hasTheory = subjectType === "theory" || subjectType === "both";
  const hasPractical = subjectType === "practical" || subjectType === "both";

  if (!marks) {
    return (
      <Card className="overflow-hidden border border-divider bg-background shadow-sm">
        <Card.Header className="border-b border-divider bg-default/5 px-6 py-4">
          <Card.Title className="text-base font-semibold">Your Marks</Card.Title>
        </Card.Header>
        <Card.Content className="p-6">
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Marks Not Published
            </p>
            <p className="text-xs text-muted-foreground">
              Your marks will appear here once published by the faculty.
            </p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  const totalObtained = useMemo(() => {
    let t = 0;
    if (marks.internalTheory) t += Number(marks.internalTheory);
    if (marks.externalTheory) t += Number(marks.externalTheory);
    if (marks.internalPractical) t += Number(marks.internalPractical);
    if (marks.externalPractical) t += Number(marks.externalPractical);
    return t;
  }, [marks]);

  const totalMax = useMemo(() => {
    let t = 0;
    if (marks.maxInternalTheory) t += Number(marks.maxInternalTheory);
    if (marks.maxExternalTheory) t += Number(marks.maxExternalTheory);
    if (marks.maxInternalPractical) t += Number(marks.maxInternalPractical);
    if (marks.maxExternalPractical) t += Number(marks.maxExternalPractical);
    return t;
  }, [marks]);

  return (
    <Card className="overflow-hidden border border-divider bg-background shadow-sm">
      <Card.Header className="border-b border-divider bg-default/5 px-6 py-4">
        <Card.Title className="text-base font-semibold">Your Marks</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-4 p-6">
        {hasTheory && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Theory
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <MarksCell
                label="Internal"
                obtained={marks.internalTheory}
                max={marks.maxInternalTheory}
              />
              <MarksCell
                label="External"
                obtained={marks.externalTheory}
                max={marks.maxExternalTheory}
              />
            </div>
          </div>
        )}

        {hasTheory && hasPractical && <Separator />}

        {hasPractical && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Practical
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <MarksCell
                label="Internal"
                obtained={marks.internalPractical}
                max={marks.maxInternalPractical}
              />
              <MarksCell
                label="External"
                obtained={marks.externalPractical}
                max={marks.maxExternalPractical}
              />
            </div>
          </div>
        )}

        <Separator />
        <div className="flex items-center justify-between rounded-lg bg-default/10 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">
            {totalObtained} / {totalMax}
          </span>
        </div>
      </Card.Content>
    </Card>
  );
}

// ─── Utility Components ───────────────────────────────────────────────────────

function InfoCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function MarksCell({
  label,
  obtained,
  max,
}: {
  label: string;
  obtained: string | null;
  max: string | null;
}) {
  return (
    <div className="rounded-lg border border-divider bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">
        {obtained != null ? Number(obtained) : "—"}
        <span className="text-xs font-normal text-muted-foreground">
          {" "}/ {max != null ? Number(max) : "—"}
        </span>
      </p>
    </div>
  );
}
