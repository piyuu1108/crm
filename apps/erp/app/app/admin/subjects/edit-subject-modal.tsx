"use client";

import React, { useState, useEffect } from "react";
import {
  Alert,
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  NumberField,
  Select,
  Separator,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { TriangleExclamation } from "@gravity-ui/icons";
import type { Key } from "@heroui/react";
import {
  useUpdateSubjectMutation,
  type SubjectAdminListItem,
} from "@/app/lib/queries/subjects";

interface EditSubjectModalProps {
  subject: SubjectAdminListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  practical: "Practical",
  both: "Both (Theory + Practical)",
  project_minor: "Project Minor",
  project_major: "Project Major",
};

const SUBJECT_TYPES = ["theory", "practical", "both", "project_minor", "project_major"];

interface SubjectForm {
  code: string;
  name: string;
  shortCode: string;
  subjectType: string;
  credit: string;
  semester: string;
  internalTheoryMax: string;
  externalTheoryMax: string;
  theoryPassingMarks: string;
  internalPracticalMax: string;
  externalPracticalMax: string;
  practicalPassingMarks: string;
}

type FormErrors = Partial<Record<keyof SubjectForm, string>>;

const EMPTY_FORM: SubjectForm = {
  code: "",
  name: "",
  shortCode: "",
  subjectType: "",
  credit: "",
  semester: "",
  internalTheoryMax: "",
  externalTheoryMax: "",
  theoryPassingMarks: "",
  internalPracticalMax: "",
  externalPracticalMax: "",
  practicalPassingMarks: "",
};

export function EditSubjectModal({
  subject,
  isOpen,
  onClose,
}: EditSubjectModalProps) {
  const [form, setForm] = useState<SubjectForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [originalSemester, setOriginalSemester] = useState<string>("");
  const [originalType, setOriginalType] = useState<string>("");

  const mutation = useUpdateSubjectMutation();

  useEffect(() => {
    if (subject && isOpen) {
      const f: SubjectForm = {
        code: subject.code ?? "",
        name: subject.name ?? "",
        shortCode: subject.shortCode ?? "",
        subjectType: subject.subjectType ?? "",
        credit: subject.credit != null ? String(subject.credit) : "",
        semester: subject.semester != null ? String(subject.semester) : "",
        internalTheoryMax:
          subject.internalTheoryMax != null ? String(subject.internalTheoryMax) : "",
        externalTheoryMax:
          subject.externalTheoryMax != null ? String(subject.externalTheoryMax) : "",
        theoryPassingMarks:
          subject.theoryPassingMarks != null ? String(subject.theoryPassingMarks) : "",
        internalPracticalMax:
          subject.internalPracticalMax != null ? String(subject.internalPracticalMax) : "",
        externalPracticalMax:
          subject.externalPracticalMax != null ? String(subject.externalPracticalMax) : "",
        practicalPassingMarks:
          subject.practicalPassingMarks != null ? String(subject.practicalPassingMarks) : "",
      };
      setForm(f);
      setOriginalSemester(f.semester);
      setOriginalType(f.subjectType);
      setErrors({});
    }
  }, [subject, isOpen]);

  const updateField = <K extends keyof SubjectForm>(field: K, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const hasAssignments = (subject?.assignments?.length ?? 0) > 0;
  const semesterChanged = form.semester !== originalSemester && originalSemester !== "";
  const typeChanged = form.subjectType !== originalType && originalType !== "";

  const isProject = form.subjectType === "project_minor" || form.subjectType === "project_major";
  const hasTheory = !isProject && (form.subjectType === "theory" || form.subjectType === "both");
  const hasPractical = !isProject && (form.subjectType === "practical" || form.subjectType === "both");

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.code.trim()) e.code = "Subject code is required";
    else if (form.code.trim().length > 20) e.code = "Max 20 characters";

    if (!form.name.trim()) e.name = "Subject name is required";
    else if (form.name.trim().length > 100) e.name = "Max 100 characters";

    if (!form.subjectType) e.subjectType = "Subject type is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate() || !subject) return;

    try {
      const result = await mutation.mutateAsync({
        id: subject.id,
        code: form.code.trim(),
        name: form.name.trim(),
        shortCode: form.shortCode.trim() || undefined,
        subjectType: form.subjectType,
        credit: form.credit ? Number(form.credit) : null,
        semester: form.semester ? Number(form.semester) : null,
        internalTheoryMax: hasTheory && form.internalTheoryMax ? Number(form.internalTheoryMax) : null,
        externalTheoryMax: hasTheory && form.externalTheoryMax ? Number(form.externalTheoryMax) : null,
        theoryPassingMarks: hasTheory && form.theoryPassingMarks ? Number(form.theoryPassingMarks) : null,
        internalPracticalMax: hasPractical && form.internalPracticalMax ? Number(form.internalPracticalMax) : null,
        externalPracticalMax: hasPractical && form.externalPracticalMax ? Number(form.externalPracticalMax) : null,
        practicalPassingMarks: hasPractical && form.practicalPassingMarks ? Number(form.practicalPassingMarks) : null,
      });

      toast.success("Subject updated", {
        description: `"${result.subject.name}" updated successfully.`,
      });
      handleClose();
    } catch (err) {
      const serverErrors = (err as Error & { errors?: FormErrors }).errors;
      if (serverErrors) {
        setErrors(serverErrors);
      } else {
        toast.danger("Failed to update subject", {
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    }
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Modal.Container placement="center">
          <Modal.Dialog className="w-full max-w-xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Edit Subject</h2>
                <p className="text-sm font-normal text-muted-foreground">
                  Update details for <strong>{subject?.name}</strong> ({subject?.code})
                </p>
              </div>
            </Modal.Header>

            <Modal.Body>
              {/* ── Impact Warnings ──────────────────────────────────── */}
              {hasAssignments && (semesterChanged || typeChanged) && (
                <div className="mb-4 flex flex-col gap-2">
                  {semesterChanged && (
                    <Alert status="warning">
                      <Alert.Indicator>
                        <TriangleExclamation className="size-4" />
                      </Alert.Indicator>
                      <Alert.Content>
                        <Alert.Title>Semester Change Impact</Alert.Title>
                        <Alert.Description>
                          Changing the semester will <strong>not</strong> automatically move this
                          subject out of its {subject!.assignments.length} existing assignment(s).
                          Divisions assigned to a different semester will become inconsistent —
                          review and update assignments manually after saving.
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                  {typeChanged && (
                    <Alert status="warning">
                      <Alert.Indicator>
                        <TriangleExclamation className="size-4" />
                      </Alert.Indicator>
                      <Alert.Content>
                        <Alert.Title>Type Change Impact</Alert.Title>
                        <Alert.Description>
                          Changing the subject type from <strong>{TYPE_LABELS[originalType]}</strong>{" "}
                          to <strong>{TYPE_LABELS[form.subjectType]}</strong> will clear the marks
                          scheme for the removed component. Marks already recorded under{" "}
                          {subject!.assignments.length} assignment(s) may become invalid.
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                </div>
              )}

              <form id="edit-subject-form" className="flex flex-col gap-4 py-1" onSubmit={handleSubmit}>
                {/* ── Basic Info ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    fullWidth
                    isRequired
                    name="code"
                    value={form.code}
                    onChange={(v) => updateField("code", v)}
                    isInvalid={!!errors.code}
                  >
                    <Label>Subject Code</Label>
                    <Input placeholder="e.g. BCA101" variant="secondary" />
                    {errors.code && <FieldError>{errors.code}</FieldError>}
                  </TextField>

                  <TextField
                    fullWidth
                    name="shortCode"
                    value={form.shortCode}
                    onChange={(v) => updateField("shortCode", v)}
                  >
                    <Label>Short Code</Label>
                    <Input placeholder="e.g. DL, JAVA" variant="secondary" />
                  </TextField>
                </div>

                <TextField
                  fullWidth
                  isRequired
                  name="name"
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                  isInvalid={!!errors.name}
                >
                  <Label>Subject Name</Label>
                  <Input placeholder="e.g. Java Programming" variant="secondary" />
                  {errors.name && <FieldError>{errors.name}</FieldError>}
                </TextField>

                <div className="grid grid-cols-3 gap-4">
                  <Select
                    isRequired
                    isInvalid={!!errors.subjectType}
                    selectedKey={form.subjectType || null}
                    placeholder="Select type"
                    onSelectionChange={(key: Key | null) => {
                      const newType = String(key ?? "");
                      updateField("subjectType", newType);
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
                    {errors.subjectType && <FieldError>{errors.subjectType}</FieldError>}
                  </Select>

                  <NumberField
                    minValue={1}
                    maxValue={8}
                    value={form.semester ? Number(form.semester) : undefined}
                    onChange={(v) => updateField("semester", String(v ?? ""))}
                  >
                    <Label>Semester</Label>
                    <Input placeholder="e.g. 3" variant="secondary" />
                  </NumberField>

                  <NumberField
                    minValue={0}
                    value={form.credit ? Number(form.credit) : undefined}
                    onChange={(v) => updateField("credit", String(v ?? ""))}
                  >
                    <Label>Credits</Label>
                    <Input placeholder="e.g. 4" variant="secondary" />
                  </NumberField>
                </div>

                {/* ── Marks Config (conditional) ─────────────────────── */}
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
                            minValue={0}
                            value={form.internalTheoryMax ? Number(form.internalTheoryMax) : undefined}
                            onChange={(v) => updateField("internalTheoryMax", String(v ?? ""))}
                          >
                            <Label>Internal</Label>
                            <Input placeholder="30" variant="secondary" />
                          </NumberField>
                          <NumberField
                            minValue={0}
                            value={form.externalTheoryMax ? Number(form.externalTheoryMax) : undefined}
                            onChange={(v) => updateField("externalTheoryMax", String(v ?? ""))}
                          >
                            <Label>External</Label>
                            <Input placeholder="70" variant="secondary" />
                          </NumberField>
                          <NumberField
                            minValue={0}
                            value={form.theoryPassingMarks ? Number(form.theoryPassingMarks) : undefined}
                            onChange={(v) => updateField("theoryPassingMarks", String(v ?? ""))}
                          >
                            <Label>Passing</Label>
                            <Input placeholder="28" variant="secondary" />
                          </NumberField>
                        </div>
                      </div>
                    )}

                    {hasTheory && hasPractical && <Separator />}

                    {hasPractical && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Practical</p>
                        <div className="grid grid-cols-3 gap-3">
                          <NumberField
                            minValue={0}
                            value={form.internalPracticalMax ? Number(form.internalPracticalMax) : undefined}
                            onChange={(v) => updateField("internalPracticalMax", String(v ?? ""))}
                          >
                            <Label>Internal</Label>
                            <Input placeholder="25" variant="secondary" />
                          </NumberField>
                          <NumberField
                            minValue={0}
                            value={form.externalPracticalMax ? Number(form.externalPracticalMax) : undefined}
                            onChange={(v) => updateField("externalPracticalMax", String(v ?? ""))}
                          >
                            <Label>External</Label>
                            <Input placeholder="25" variant="secondary" />
                          </NumberField>
                          <NumberField
                            minValue={0}
                            value={form.practicalPassingMarks ? Number(form.practicalPassingMarks) : undefined}
                            onChange={(v) => updateField("practicalPassingMarks", String(v ?? ""))}
                          >
                            <Label>Passing</Label>
                            <Input placeholder="13" variant="secondary" />
                          </NumberField>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </form>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" form="edit-subject-form" isPending={mutation.isPending}>
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Saving…" : "Save Changes"}
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
