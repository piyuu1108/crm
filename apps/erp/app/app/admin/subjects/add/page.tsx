"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Separator,
  TextField,
  toast,
} from "@heroui/react";
import { ArrowLeft, Check, Plus } from "@gravity-ui/icons";
import { useRouter } from "next/navigation";
import { useCreateSubjectMutation } from "@/app/lib/queries/subjects";
import {
  INITIAL_SUBJECT_FORM,
  SubjectSchema,
  type SubjectInput as SubjectFormData,
} from "@/app/lib/validations/schemas/subject";
import { SubjectTypeSchema } from "@/app/lib/validations/schemas/common";


const SUBJECT_TYPES = SubjectTypeSchema.options;
import type { Key } from "@heroui/react";


const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  practical: "Practical",
  both: "Both (Theory + Practical)",
};

export default function AddSubjectPage() {
  const router = useRouter();
  const mutation = useCreateSubjectMutation();

  const [form, setForm] = useState<SubjectFormData>({ ...INITIAL_SUBJECT_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const updateField = useCallback(
    <K extends keyof SubjectFormData>(field: K, value: SubjectFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear field error on change
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const hasTheory = form.subjectType === "theory" || form.subjectType === "both";
  const hasPractical = form.subjectType === "practical" || form.subjectType === "both";

  // Compute total marks for display
  const totals = useMemo(() => {
    const itMax = Number(form.internalTheoryMax) || 0;
    const etMax = Number(form.externalTheoryMax) || 0;
    const ipMax = Number(form.internalPracticalMax) || 0;
    const epMax = Number(form.externalPracticalMax) || 0;
    return {
      theory: itMax + etMax,
      practical: ipMax + epMax,
      total: itMax + etMax + ipMax + epMax,
    };
  }, [form.internalTheoryMax, form.externalTheoryMax, form.internalPracticalMax, form.externalPracticalMax]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);

      const validation = SubjectSchema.safeParse(form);
      if (!validation.success) {
        const formattedErrors: Record<string, string> = {};
        validation.error.issues.forEach((i: any) => {
          const key = i.path.join(".");
          if (!formattedErrors[key]) formattedErrors[key] = i.message;
        });
        setErrors(formattedErrors);
        return;
      }
      setErrors({});

      try {
        await mutation.mutateAsync(form);
        setCreated(true);
        toast.success("Subject created successfully");
      } catch (err) {
        const error = err as Error & { errors?: Record<string, string> };
        setServerError(error.message);
        if (error.errors) {
          setErrors(error.errors);
        }
      }
    },
    [form, mutation]
  );

  const handleReset = useCallback(() => {
    setForm({ ...INITIAL_SUBJECT_FORM });
    setErrors({});
    setServerError(null);
    setCreated(false);
  }, []);

  // ─── Success State ────────────────────────────────────────────────
  if (created) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 py-4">
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Subject Created</Alert.Title>
            <Alert.Description>
              Subject <strong>{form.name}</strong> ({form.code}) has been created successfully.
            </Alert.Description>
          </Alert.Content>
        </Alert>

        <Card className="border border-divider bg-background shadow-sm">
          <Card.Content className="p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryField label="Subject Code" value={form.code} />
              <SummaryField label="Subject Name" value={form.name} />
              <SummaryField label="Subject Type" value={TYPE_LABELS[form.subjectType] ?? form.subjectType} />
              {hasTheory && (
                <>
                  <SummaryField label="Internal Theory" value={String(form.internalTheoryMax)} />
                  <SummaryField label="External Theory" value={String(form.externalTheoryMax)} />
                  <SummaryField label="Theory Passing" value={String(form.theoryPassingMarks)} />
                </>
              )}
              {hasPractical && (
                <>
                  <SummaryField label="Internal Practical" value={String(form.internalPracticalMax)} />
                  <SummaryField label="External Practical" value={String(form.externalPracticalMax)} />
                  <SummaryField label="Practical Passing" value={String(form.practicalPassingMarks)} />
                </>
              )}
              <SummaryField label="Total Marks" value={String(totals.total)} />
            </div>
          </Card.Content>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onPress={handleReset}>
            <Plus className="size-4" />
            Add Another Subject
          </Button>
          <Button variant="tertiary" onPress={() => router.push("/app/admin")}>
            <ArrowLeft className="size-4" />
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  // ─── Form State ───────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 py-4">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Subject</h1>
        <p className="text-sm text-muted-foreground">
          Create a new subject with its marking scheme.
        </p>
      </div>

      {serverError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{serverError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Basic Information ────────────────────────── */}
        <Card className="overflow-hidden border border-divider bg-background shadow-sm">
          <Card.Header className="border-b border-divider bg-default/5 px-6 py-4">
            <Card.Title className="text-base font-semibold">Basic Information</Card.Title>
            <Card.Description className="text-xs text-muted-foreground">
              Subject identity and type
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                isRequired
                isInvalid={!!errors["code"]}
                value={form.code}
                onChange={(v) => updateField("code", v)}
              >
                <Label>Subject Code</Label>
                <Input placeholder="e.g. 301-01, BCA101" />
                {errors["code"] && (
                  <FieldError>{errors["code"]}</FieldError>
                )}
              </TextField>

              <TextField
                isRequired
                isInvalid={!!errors["name"]}
                value={form.name}
                onChange={(v) => updateField("name", v)}
              >
                <Label>Subject Name</Label>
                <Input placeholder="e.g. Java Programming" />
                {errors["name"] && (
                  <FieldError>{errors["name"]}</FieldError>
                )}
              </TextField>
            </div>

            <Select
              isRequired
              isInvalid={!!errors["subjectType"]}
              selectedKey={form.subjectType || null}
              placeholder="Select subject type"
              onSelectionChange={(key: Key | null) => {
                const newType = String(key ?? "") as SubjectFormData["subjectType"];
                updateField("subjectType", newType);
                // Clear marks for fields that are no longer relevant
                if (newType === "theory") {
                  setForm((prev) => ({
                    ...prev,
                    subjectType: newType,
                    internalPracticalMax: "",
                    externalPracticalMax: "",
                    practicalPassingMarks: "",
                  }));
                } else if (newType === "practical") {
                  setForm((prev) => ({
                    ...prev,
                    subjectType: newType,
                    internalTheoryMax: "",
                    externalTheoryMax: "",
                    theoryPassingMarks: "",
                  }));
                }
              }}
            >
              <Label>Subject Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {SUBJECT_TYPES.map((t) => (
                    <ListBox.Item key={t} id={t}>
                      {TYPE_LABELS[t] ?? t}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              {errors["subjectType"] && (
                <FieldError>{errors["subjectType"]}</FieldError>
              )}
            </Select>
          </Card.Content>
        </Card>

        {/* ── Section 2: Marks Configuration (dynamic) ───────────── */}
        {form.subjectType && (
          <Card className="overflow-hidden border border-divider bg-background shadow-sm">
            <Card.Header className="border-b border-divider bg-default/5 px-6 py-4">
              <Card.Title className="text-base font-semibold">Marks Configuration</Card.Title>
              <Card.Description className="text-xs text-muted-foreground">
                Define the marking scheme for this subject
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-6 p-6">
              {/* Theory marks */}
              {hasTheory && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      T
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">Theory Marks</h3>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <NumberField
                      isRequired
                      minValue={0}
                      isInvalid={!!errors["internalTheoryMax"]}
                      value={form.internalTheoryMax ? Number(form.internalTheoryMax) : undefined}
                      onChange={(v) => updateField("internalTheoryMax", String(v ?? ""))}
                    >
                      <Label>Internal Marks</Label>
                      <Input placeholder="e.g. 30" />
                      {errors["internalTheoryMax"] && (
                        <FieldError>{errors["internalTheoryMax"]}</FieldError>
                      )}
                    </NumberField>
                    <NumberField
                      isRequired
                      minValue={0}
                      isInvalid={!!errors["externalTheoryMax"]}
                      value={form.externalTheoryMax ? Number(form.externalTheoryMax) : undefined}
                      onChange={(v) => updateField("externalTheoryMax", String(v ?? ""))}
                    >
                      <Label>External Marks</Label>
                      <Input placeholder="e.g. 70" />
                      {errors["externalTheoryMax"] && (
                        <FieldError>{errors["externalTheoryMax"]}</FieldError>
                      )}
                    </NumberField>
                    <NumberField
                      isRequired
                      minValue={0}
                      isInvalid={!!errors["theoryPassingMarks"]}
                      value={form.theoryPassingMarks ? Number(form.theoryPassingMarks) : undefined}
                      onChange={(v) => updateField("theoryPassingMarks", String(v ?? ""))}
                    >
                      <Label>Passing Marks</Label>
                      <Input placeholder="e.g. 28" />
                      {errors["theoryPassingMarks"] && (
                        <FieldError>{errors["theoryPassingMarks"]}</FieldError>
                      )}
                    </NumberField>
                  </div>
                  {hasTheory && totals.theory > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Total Theory: <strong className="text-foreground">{totals.theory}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Separator between theory and practical for "both" */}
              {hasTheory && hasPractical && <Separator />}

              {/* Practical marks */}
              {hasPractical && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">
                      P
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">Practical Marks</h3>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <NumberField
                      isRequired
                      minValue={0}
                      isInvalid={!!errors["internalPracticalMax"]}
                      value={form.internalPracticalMax ? Number(form.internalPracticalMax) : undefined}
                      onChange={(v) => updateField("internalPracticalMax", String(v ?? ""))}
                    >
                      <Label>Internal Marks</Label>
                      <Input placeholder="e.g. 25" />
                      {errors["internalPracticalMax"] && (
                        <FieldError>{errors["internalPracticalMax"]}</FieldError>
                      )}
                    </NumberField>
                    <NumberField
                      isRequired
                      minValue={0}
                      isInvalid={!!errors["externalPracticalMax"]}
                      value={form.externalPracticalMax ? Number(form.externalPracticalMax) : undefined}
                      onChange={(v) => updateField("externalPracticalMax", String(v ?? ""))}
                    >
                      <Label>External Marks</Label>
                      <Input placeholder="e.g. 25" />
                      {errors["externalPracticalMax"] && (
                        <FieldError>{errors["externalPracticalMax"]}</FieldError>
                      )}
                    </NumberField>
                    <NumberField
                      isRequired
                      minValue={0}
                      isInvalid={!!errors["practicalPassingMarks"]}
                      value={form.practicalPassingMarks ? Number(form.practicalPassingMarks) : undefined}
                      onChange={(v) => updateField("practicalPassingMarks", String(v ?? ""))}
                    >
                      <Label>Passing Marks</Label>
                      <Input placeholder="e.g. 13" />
                      {errors["practicalPassingMarks"] && (
                        <FieldError>{errors["practicalPassingMarks"]}</FieldError>
                      )}
                    </NumberField>
                  </div>
                  {hasPractical && totals.practical > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Total Practical: <strong className="text-foreground">{totals.practical}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Grand total */}
              {form.subjectType && totals.total > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between rounded-lg bg-default/10 px-4 py-3">
                    <span className="text-sm font-medium text-muted-foreground">Grand Total Marks</span>
                    <span className="text-lg font-bold text-foreground">{totals.total}</span>
                  </div>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* ── Submit ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            type="button"
            onPress={() => router.back()}
          >
            <ArrowLeft className="size-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            isPending={mutation.isPending}
            isDisabled={mutation.isPending || !form.subjectType}
          >
            <Check className="size-4" />
            Create Subject
          </Button>
        </div>
      </form>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
