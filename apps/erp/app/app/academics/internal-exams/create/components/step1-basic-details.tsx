"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  TextField,
  Input,
  Label,
  Description,
  FieldError,
  Select,
  ListBox,
  TextArea,
  Spinner,
  toast,
} from "@heroui/react";
import { Save } from "lucide-react";
import {
  useCreateDraftMutation,
  useUpdateStep1Mutation,
  type ExamDraft,
} from "@/app/lib/queries/exam-wizard";

interface Step1Props {
  examId: number;
  examData: ExamDraft | null;
  onDraftCreated: (id: number) => void;
  onSaved: () => void;
  onSaving: () => void;
  onError: () => void;
}

const EXAM_TYPES = [
  { value: "internal", label: "Internal Assessment" },
  { value: "mid", label: "Mid-Term Exam" },
  { value: "unit", label: "Unit Test" },
];

export function Step1BasicDetails({ examId, examData, onDraftCreated, onSaved, onSaving, onError }: Step1Props) {
  const [form, setForm] = useState({
    examName: "",
    examNumber: "1",
    description: "",
    examType: "internal",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateDraftMutation();
  const updateMutation = useUpdateStep1Mutation(examId);

  // Hydrate form from existing data
  useEffect(() => {
    if (examData) {
      setForm({
        examName: examData.examName || "",
        examNumber: String(examData.examNumber || 1),
        description: examData.description || "",
        examType: examData.examType || "internal",
      });
    }
  }, [examData]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.examName.trim()) errs.examName = "Exam name is required";
    if (!form.examNumber || parseInt(form.examNumber) < 1) errs.examNumber = "Must be at least 1";
    if (!form.examType) errs.examType = "Select an exam type";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    onSaving();

    const payload = {
      examName: form.examName.trim(),
      examNumber: parseInt(form.examNumber),
      description: form.description.trim() || undefined,
      examType: form.examType,
    };

    try {
      if (examId > 0) {
        await updateMutation.mutateAsync(payload);
        onSaved();
        toast.success("Basic details saved");
      } else {
        const created = await createMutation.mutateAsync(payload);
        onDraftCreated(created.id);
      }
    } catch (err) {
      onError();
      toast.danger("Failed to save", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-divider/20">
        <h2 className="text-lg font-semibold text-foreground">Basic Details</h2>
        <p className="text-sm text-default-500 mt-0.5">
          Define the examination name, type, and numbering.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Exam Name */}
          <TextField
            fullWidth
            isRequired
            name="examName"
            value={form.examName}
            onChange={(v) => updateField("examName", v)}
            isInvalid={!!errors.examName}
          >
            <Label>Exam Name</Label>
            <Input placeholder="e.g. Internal Assessment 1" variant="secondary" />
            <Description>A descriptive name for this examination</Description>
            {errors.examName && <FieldError>{errors.examName}</FieldError>}
          </TextField>

          {/* Exam Number */}
          <TextField
            fullWidth
            isRequired
            name="examNumber"
            value={form.examNumber}
            onChange={(v) => updateField("examNumber", v)}
            isInvalid={!!errors.examNumber}
          >
            <Label>Exam Number</Label>
            <Input placeholder="e.g. 1" variant="secondary" type="number" min={1} />
            <Description>Sequential exam number for this semester</Description>
            {errors.examNumber && <FieldError>{errors.examNumber}</FieldError>}
          </TextField>
        </div>

        {/* Exam Type */}
        <Select
          isRequired
          fullWidth
          name="examType"
          placeholder="Select type"
          variant="secondary"
          selectedKey={form.examType}
          onSelectionChange={(key) => updateField("examType", String(key))}
          isInvalid={!!errors.examType}
        >
          <Label>Exam Type</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {EXAM_TYPES.map((t) => (
                <ListBox.Item key={t.value} id={t.value} textValue={t.label}>
                  {t.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          <Description>Type of internal examination</Description>
          {errors.examType && <FieldError>{errors.examType}</FieldError>}
        </Select>

        {/* Description */}
        <TextField
          fullWidth
          name="description"
          value={form.description}
          onChange={(v) => updateField("description", v)}
        >
          <Label>Description</Label>
          <TextArea placeholder="Optional notes or instructions for this examination…" variant="secondary" rows={3} />
          <Description>Optional description visible to faculty</Description>
        </TextField>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-divider/20 flex justify-end">
        <Button onPress={handleSave} isPending={isPending}>
          {({ isPending: p }) => (
            <>
              {p && <Spinner color="current" size="sm" />}
              <Save className="size-4" />
              {examId > 0 ? "Save Changes" : "Create Draft"}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
