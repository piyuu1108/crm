"use client";

import React, { useState, useMemo } from "react";
import {
  Button,
  Drawer,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import type { UseOverlayStateReturn } from "@heroui/react";
import { useCreateDivisionMutation } from "@/app/lib/queries/divisions";

interface CreateDivisionDrawerProps {
  state: UseOverlayStateReturn;
}

const SPECIALIZATION_OPTIONS = [
  { value: "AI", label: "Artificial Intelligence (AI)" },
  { value: "DS", label: "Data Science (DS)" },
  { value: "REGULAR", label: "Regular (REG)" },
];

const SEMESTER_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  value: String(i + 1),
  label: `Semester ${i + 1}`,
}));

const SPECIALIZATION_CODES: Record<string, string> = {
  AI: "AI",
  DS: "DS",
  REGULAR: "REG",
};

const INITIAL_FORM = {
  batchYear: "",
  semesterNo: "",
  specialization: "",
};

type FormErrors = Partial<Record<keyof typeof INITIAL_FORM, string>>;

export function CreateDivisionDrawer({ state }: CreateDivisionDrawerProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const mutation = useCreateDivisionMutation();

  const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ── Live preview of generated division name ──────────────────────
  const previewName = useMemo(() => {
    const year = form.batchYear.trim();
    const spec = form.specialization;

    if (!year || year.length < 4 || !spec) return null;

    const yy = year.slice(-2);
    const specCode = SPECIALIZATION_CODES[spec] || spec;
    // Division number is auto-assigned — show "#" as placeholder
    return `${yy}BCA${specCode}DIV#`;
  }, [form.batchYear, form.specialization]);

  const validate = (): boolean => {
    const e: FormErrors = {};

    const yearNum = parseInt(form.batchYear, 10);
    if (!form.batchYear.trim() || isNaN(yearNum)) {
      e.batchYear = "Batch year is required";
    } else if (yearNum < 2020 || yearNum > 2099) {
      e.batchYear = "Year must be between 2020 and 2099";
    }

    if (!form.semesterNo) {
      e.semesterNo = "Semester is required";
    }

    if (!form.specialization) {
      e.specialization = "Specialization is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await mutation.mutateAsync({
        batchYear: parseInt(form.batchYear, 10),
        semesterNo: parseInt(form.semesterNo, 10),
        specialization: form.specialization,
      });

      toast.success("Division created", {
        description: `${result.displayName} has been created successfully`,
      });

      setForm(INITIAL_FORM);
      setErrors({});
      state.close();
    } catch (err) {
      const serverErrors = (err as Error & { errors?: FormErrors }).errors;
      if (serverErrors) {
        setErrors(serverErrors);
      } else {
        toast.danger("Failed to create division", {
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    }
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      setForm(INITIAL_FORM);
      setErrors({});
      state.close();
    }
  };

  return (
    <Drawer state={state}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-full max-w-md">
            <Drawer.CloseTrigger />

            <Drawer.Header>
              <Drawer.Heading>Create Division</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body>
              <form
                id="create-division-form"
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
              >
                {/* Batch Year */}
                <TextField
                  fullWidth
                  isRequired
                  name="batchYear"
                  value={form.batchYear}
                  onChange={(v) => updateField("batchYear", v)}
                  isInvalid={!!errors.batchYear}
                >
                  <Label>Batch Year</Label>
                  <Input
                    placeholder="e.g. 2026"
                    variant="secondary"
                    type="number"
                    min={2020}
                    max={2099}
                  />
                  <Description>
                    The admission year for this batch
                  </Description>
                  {errors.batchYear && (
                    <FieldError>{errors.batchYear}</FieldError>
                  )}
                </TextField>

                {/* Semester */}
                <Select
                  isRequired
                  fullWidth
                  name="semesterNo"
                  placeholder="Select semester"
                  variant="secondary"
                  selectedKey={form.semesterNo}
                  onSelectionChange={(key) =>
                    updateField("semesterNo", String(key))
                  }
                  isInvalid={!!errors.semesterNo}
                >
                  <Label>Semester</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {SEMESTER_OPTIONS.map((opt) => (
                        <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                  <Description>Academic semester level</Description>
                  {errors.semesterNo && (
                    <FieldError>{errors.semesterNo}</FieldError>
                  )}
                </Select>

                {/* Specialization */}
                <Select
                  isRequired
                  fullWidth
                  name="specialization"
                  placeholder="Select specialization"
                  variant="secondary"
                  selectedKey={form.specialization}
                  onSelectionChange={(key) =>
                    updateField("specialization", String(key))
                  }
                  isInvalid={!!errors.specialization}
                >
                  <Label>Specialization</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {SPECIALIZATION_OPTIONS.map((opt) => (
                        <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                  <Description>Course specialization track</Description>
                  {errors.specialization && (
                    <FieldError>{errors.specialization}</FieldError>
                  )}
                </Select>

                {/* Live Preview */}
                {previewName && (
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      Division Name Preview
                    </p>
                    <p className="text-lg font-bold font-mono text-accent">
                      {previewName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      # will be auto-assigned as the next available number
                    </p>
                  </div>
                )}
              </form>
            </Drawer.Body>

            <Drawer.Footer>
              <Button
                variant="secondary"
                onPress={handleClose}
                isDisabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-division-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Creating…" : "Create Division"}
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
