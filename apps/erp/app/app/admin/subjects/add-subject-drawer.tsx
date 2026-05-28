"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  FieldError,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Separator,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import type { UseOverlayStateReturn, Key } from "@heroui/react";
import { useCreateSubjectMutation } from "@/app/lib/queries/subjects";
import {
  INITIAL_SUBJECT_FORM,
  SubjectSchema,
  type SubjectInput as SubjectFormData,
} from "@/app/lib/validations/schemas/subject";
import { SubjectTypeSchema } from "@/app/lib/validations/schemas/common";

interface ValidationError {
  field: string;
  message: string;
}

const SUBJECT_TYPES = SubjectTypeSchema.options;
import { useQueryClient } from "@tanstack/react-query";
import { adminSubjectsListKey } from "@/app/lib/queries/subjects";

interface AddSubjectDrawerProps {
  state: UseOverlayStateReturn;
}

function getFieldError(errors: ValidationError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  practical: "Practical",
  both: "Both (Theory + Practical)",
  project_minor: "Project Minor",
  project_major: "Project Major",
};

export function AddSubjectDrawer({ state }: AddSubjectDrawerProps) {
  const queryClient = useQueryClient();
  const mutation = useCreateSubjectMutation();

  const [form, setForm] = useState<SubjectFormData>({ ...INITIAL_SUBJECT_FORM });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof SubjectFormData>(field: K, value: SubjectFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => prev.filter((e) => e.field !== field));
    },
    []
  );

  const isProject = form.subjectType === "project_minor" || form.subjectType === "project_major";
  const hasTheory = !isProject && (form.subjectType === "theory" || form.subjectType === "both");
  const hasPractical = !isProject && (form.subjectType === "practical" || form.subjectType === "both");

  const totals = useMemo(() => {
    const itMax = Number(form.internalTheoryMax) || 0;
    const etMax = Number(form.externalTheoryMax) || 0;
    const ipMax = Number(form.internalPracticalMax) || 0;
    const epMax = Number(form.externalPracticalMax) || 0;
    return { theory: itMax + etMax, practical: ipMax + epMax, total: itMax + etMax + ipMax + epMax };
  }, [form.internalTheoryMax, form.externalTheoryMax, form.internalPracticalMax, form.externalPracticalMax]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);

      const validation = SubjectSchema.safeParse(form);
      if (!validation.success) {
        setErrors(validation.error.issues.map(i => ({ field: i.path.join("."), message: i.message })));
        return;
      }
      setErrors([]);

      try {
        const created = await mutation.mutateAsync(form);
        toast.success("Subject created", {
          description: `"${created.name}" (${created.code}) has been added.`,
        });
        // Invalidate admin list so table refreshes
        queryClient.invalidateQueries({ queryKey: adminSubjectsListKey });
        handleClose();
      } catch (err) {
        const error = err as Error & { errors?: Record<string, string> };
        setServerError(error.message);
        if (error.errors) {
          const serverErrors: ValidationError[] = Object.entries(error.errors).map(
            ([field, message]) => ({ field, message })
          );
          setErrors(serverErrors);
        }
      }
    },
    [form, mutation, queryClient]
  );

  const handleClose = () => {
    if (!mutation.isPending) {
      setForm({ ...INITIAL_SUBJECT_FORM });
      setErrors([]);
      setServerError(null);
      state.close();
    }
  };

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-full max-w-lg">
            <Drawer.CloseTrigger />

            <Drawer.Header>
              <Drawer.Heading>Add Subject</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body>
              {serverError && (
                <Alert status="danger" className="mb-4">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{serverError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <form id="add-subject-form" className="flex flex-col gap-5" onSubmit={handleSubmit}>
                {/* ── Basic Info ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    isRequired
                    isInvalid={!!getFieldError(errors, "code")}
                    value={form.code}
                    onChange={(v) => updateField("code", v)}
                  >
                    <Label>Subject Code</Label>
                    <Input placeholder="e.g. BCA101" variant="secondary" />
                    {getFieldError(errors, "code") && (
                      <FieldError>{getFieldError(errors, "code")}</FieldError>
                    )}
                  </TextField>

                  <TextField
                    value={(form as any).shortCode ?? ""}
                    onChange={(v) => updateField("shortCode" as any, v)}
                  >
                    <Label>Short Code</Label>
                    <Input placeholder="e.g. JAVA" variant="secondary" />
                  </TextField>
                </div>

                <TextField
                  isRequired
                  isInvalid={!!getFieldError(errors, "name")}
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                >
                  <Label>Subject Name</Label>
                  <Input placeholder="e.g. Java Programming" variant="secondary" />
                  {getFieldError(errors, "name") && (
                    <FieldError>{getFieldError(errors, "name")}</FieldError>
                  )}
                </TextField>

                <div className="grid grid-cols-3 gap-4">
                  <Select
                    isRequired
                    isInvalid={!!getFieldError(errors, "subjectType")}
                    selectedKey={form.subjectType || null}
                    placeholder="Type"
                    onSelectionChange={(key: Key | null) => {
                      const newType = String(key ?? "") as SubjectFormData["subjectType"];
                      updateField("subjectType", newType);
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
                    {getFieldError(errors, "subjectType") && (
                      <FieldError>{getFieldError(errors, "subjectType")}</FieldError>
                    )}
                  </Select>

                  <NumberField
                    minValue={1}
                    maxValue={8}
                    value={(form as any).semester ? Number((form as any).semester) : undefined}
                    onChange={(v) => updateField("semester" as any, String(v ?? ""))}
                  >
                    <Label>Semester</Label>
                    <Input placeholder="3" variant="secondary" />
                  </NumberField>

                  <NumberField
                    minValue={0}
                    value={(form as any).credit ? Number((form as any).credit) : undefined}
                    onChange={(v) => updateField("credit" as any, String(v ?? ""))}
                  >
                    <Label>Credits</Label>
                    <Input placeholder="4" variant="secondary" />
                  </NumberField>
                </div>

                {/* ── Marks Config ────────────────────────────────────── */}
                {form.subjectType && (
                  <>
                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Marks Configuration
                    </p>

                    {hasTheory && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Theory</p>
                        <div className="grid grid-cols-3 gap-3">
                          <NumberField
                            isRequired
                            minValue={0}
                            isInvalid={!!getFieldError(errors, "internalTheoryMax")}
                            value={form.internalTheoryMax ? Number(form.internalTheoryMax) : undefined}
                            onChange={(v) => updateField("internalTheoryMax", String(v ?? ""))}
                          >
                            <Label>Internal</Label>
                            <Input placeholder="30" variant="secondary" />
                            {getFieldError(errors, "internalTheoryMax") && (
                              <FieldError>{getFieldError(errors, "internalTheoryMax")}</FieldError>
                            )}
                          </NumberField>
                          <NumberField
                            isRequired
                            minValue={0}
                            isInvalid={!!getFieldError(errors, "externalTheoryMax")}
                            value={form.externalTheoryMax ? Number(form.externalTheoryMax) : undefined}
                            onChange={(v) => updateField("externalTheoryMax", String(v ?? ""))}
                          >
                            <Label>External</Label>
                            <Input placeholder="70" variant="secondary" />
                            {getFieldError(errors, "externalTheoryMax") && (
                              <FieldError>{getFieldError(errors, "externalTheoryMax")}</FieldError>
                            )}
                          </NumberField>
                          <NumberField
                            isRequired
                            minValue={0}
                            isInvalid={!!getFieldError(errors, "theoryPassingMarks")}
                            value={form.theoryPassingMarks ? Number(form.theoryPassingMarks) : undefined}
                            onChange={(v) => updateField("theoryPassingMarks", String(v ?? ""))}
                          >
                            <Label>Passing</Label>
                            <Input placeholder="28" variant="secondary" />
                            {getFieldError(errors, "theoryPassingMarks") && (
                              <FieldError>{getFieldError(errors, "theoryPassingMarks")}</FieldError>
                            )}
                          </NumberField>
                        </div>
                        {totals.theory > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Total Theory: <strong className="text-foreground">{totals.theory}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {hasTheory && hasPractical && <Separator />}

                    {hasPractical && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Practical</p>
                        <div className="grid grid-cols-3 gap-3">
                          <NumberField
                            isRequired
                            minValue={0}
                            isInvalid={!!getFieldError(errors, "internalPracticalMax")}
                            value={form.internalPracticalMax ? Number(form.internalPracticalMax) : undefined}
                            onChange={(v) => updateField("internalPracticalMax", String(v ?? ""))}
                          >
                            <Label>Internal</Label>
                            <Input placeholder="25" variant="secondary" />
                            {getFieldError(errors, "internalPracticalMax") && (
                              <FieldError>{getFieldError(errors, "internalPracticalMax")}</FieldError>
                            )}
                          </NumberField>
                          <NumberField
                            isRequired
                            minValue={0}
                            isInvalid={!!getFieldError(errors, "externalPracticalMax")}
                            value={form.externalPracticalMax ? Number(form.externalPracticalMax) : undefined}
                            onChange={(v) => updateField("externalPracticalMax", String(v ?? ""))}
                          >
                            <Label>External</Label>
                            <Input placeholder="25" variant="secondary" />
                            {getFieldError(errors, "externalPracticalMax") && (
                              <FieldError>{getFieldError(errors, "externalPracticalMax")}</FieldError>
                            )}
                          </NumberField>
                          <NumberField
                            isRequired
                            minValue={0}
                            isInvalid={!!getFieldError(errors, "practicalPassingMarks")}
                            value={form.practicalPassingMarks ? Number(form.practicalPassingMarks) : undefined}
                            onChange={(v) => updateField("practicalPassingMarks", String(v ?? ""))}
                          >
                            <Label>Passing</Label>
                            <Input placeholder="13" variant="secondary" />
                            {getFieldError(errors, "practicalPassingMarks") && (
                              <FieldError>{getFieldError(errors, "practicalPassingMarks")}</FieldError>
                            )}
                          </NumberField>
                        </div>
                        {totals.practical > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Total Practical: <strong className="text-foreground">{totals.practical}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {totals.total > 0 && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between rounded-lg bg-default/10 px-4 py-3">
                          <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
                          <span className="text-lg font-bold text-foreground">{totals.total}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </form>
            </Drawer.Body>

            <Drawer.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={mutation.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-subject-form"
                isPending={mutation.isPending}
                isDisabled={mutation.isPending || !form.subjectType}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Creating…" : "Create Subject"}
                  </>
                )}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
