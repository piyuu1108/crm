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


const SUBJECT_TYPES = SubjectTypeSchema.options;
import { useQueryClient } from "@tanstack/react-query";
import { adminSubjectsListKey } from "@/app/lib/queries/subjects";

interface AddSubjectDrawerProps {
  state: UseOverlayStateReturn;
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof SubjectFormData>(field: K, value: SubjectFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
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
          setErrors(error.errors);
        }
      }
    },
    [form, mutation, queryClient]
  );

  const handleClose = () => {
    if (!mutation.isPending) {
      setForm({ ...INITIAL_SUBJECT_FORM });
      setErrors({});
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
                    isInvalid={!!errors["code"]}
                    value={form.code}
                    onChange={(v) => updateField("code", v)}
                  >
                    <Label>Subject Code</Label>
                    <Input placeholder="e.g. BCA101" variant="secondary" />
                    {errors["code"] && (
                      <FieldError>{errors["code"]}</FieldError>
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
                  isInvalid={!!errors["name"]}
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                >
                  <Label>Subject Name</Label>
                  <Input placeholder="e.g. Data Structures and Algorithms" variant="secondary" />
                  {errors["name"] && (
                    <FieldError>{errors["name"]}</FieldError>
                  )}
                </TextField>

                <div className="grid grid-cols-3 gap-4">
                  <Select
                    isRequired
                    isInvalid={!!errors["subjectType"]}
                    selectedKey={form.subjectType || null}
                    placeholder="Select type"
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
                          <ListBox.Item key={t} id={t} textValue={TYPE_LABELS[t]}>
                            {TYPE_LABELS[t]}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                    {errors["subjectType"] && (
                      <FieldError>{errors["subjectType"]}</FieldError>
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
                            isInvalid={!!errors["internalTheoryMax"]}
                            value={form.internalTheoryMax ? Number(form.internalTheoryMax) : undefined}
                            onChange={(v) => updateField("internalTheoryMax", String(v ?? ""))}
                          >
                            <Label>Internal Max</Label>
                            <Input placeholder="0" variant="secondary" />
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
                            <Label>External Max</Label>
                            <Input placeholder="0" variant="secondary" />
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
                            <Label>Passing</Label>
                            <Input placeholder="28" variant="secondary" />
                            {errors["theoryPassingMarks"] && (
                              <FieldError>{errors["theoryPassingMarks"]}</FieldError>
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
                            isInvalid={!!errors["internalPracticalMax"]}
                            value={form.internalPracticalMax ? Number(form.internalPracticalMax) : undefined}
                            onChange={(v) => updateField("internalPracticalMax", String(v ?? ""))}
                          >
                            <Label>Internal Max</Label>
                            <Input placeholder="0" variant="secondary" />
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
                            <Label>External Max</Label>
                            <Input placeholder="0" variant="secondary" />
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
                            <Label>Passing</Label>
                            <Input placeholder="13" variant="secondary" />
                            {errors["practicalPassingMarks"] && (
                              <FieldError>{errors["practicalPassingMarks"]}</FieldError>
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
