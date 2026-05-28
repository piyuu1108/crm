"use client";

import React, { useState, useEffect } from "react";
import {
  TextField,
  Label,
  Input,
  Description,
  FieldError,
  Select,
  ListBox,
  Button,
  Spinner,
  Alert,
} from "@heroui/react";
import type { Key } from "@heroui/react";
import { ArrowRight } from "@gravity-ui/icons";
import { useSaveStepMutation, type ProfileData } from "@/app/lib/queries/profile";
import {
  AcademicInfoSchema,
  CATEGORIES,
  BOARDS,
  type AcademicInfoData,
} from "@/app/lib/validations/profile";

interface StepAcademicProps {
  profile: ProfileData;
  onSaved: () => void;
  onSaving: (saving: boolean) => void;
}

export function StepAcademic({ profile, onSaved, onSaving }: StepAcademicProps) {
  const saveMutation = useSaveStepMutation();

  const [form, setForm] = useState<AcademicInfoData>({
    category: (profile.category || "") as AcademicInfoData["category"],
    board: (profile.board || "") as AcademicInfoData["board"],
    twelfthPercent: profile.twelfthPercent || "",
    twelfthStream: profile.twelfthStream || "",
    schoolName: profile.schoolName || "",
    udiseCode: profile.udiseCode || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      category: (profile.category || "") as AcademicInfoData["category"],
      board: (profile.board || "") as AcademicInfoData["board"],
      twelfthPercent: profile.twelfthPercent || "",
      twelfthStream: profile.twelfthStream || "",
      schoolName: profile.schoolName || "",
      udiseCode: profile.udiseCode || "",
    });
  }, [
    profile.category,
    profile.board,
    profile.twelfthPercent,
    profile.twelfthStream,
    profile.schoolName,
    profile.udiseCode,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = AcademicInfoSchema.safeParse(form);
    if (!parsed.success) {
      const formattedErrors: Record<string, string> = {};
      parsed.error.issues.forEach(i => {
        const key = i.path.join(".");
        if (!formattedErrors[key]) formattedErrors[key] = i.message;
      });
      setErrors(formattedErrors);
      return;
    }
    setErrors({});

    onSaving(true);
    try {
      await saveMutation.mutateAsync({ step: 3, data: { ...form } as unknown as Record<string, unknown> });
      onSaved();
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      onSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{serverError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Locked fields from division assignment */}
      <div className="rounded-lg border border-divider bg-default/5 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Assigned by HOD (Read-only)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Student ID</p>
            <p className="text-sm font-medium">{profile.studentId || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Course</p>
            <p className="text-sm font-medium">{profile.courseName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Division</p>
            <p className="text-sm font-medium">{profile.currentDivisionName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Semester</p>
            <p className="text-sm font-medium">Sem {profile.currentSemesterNo ?? profile.entrySemesterNo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entry Type</p>
            <p className="text-sm font-medium capitalize">{profile.entryType}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          isRequired
          isInvalid={!!errors["category"]}
          placeholder="Select category"
          value={form.category || null}
          onChange={(key: Key | null) =>
            setForm((p) => ({ ...p, category: String(key ?? "") as AcademicInfoData["category"] }))
          }
        >
          <Label>Category</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {CATEGORIES.map((c: string) => (
                <ListBox.Item key={c} id={c} textValue={c}>
                  {c}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          {errors["category"] && (
            <FieldError>{errors["category"]}</FieldError>
          )}
        </Select>

        <Select
          isRequired
          isInvalid={!!errors["board"]}
          placeholder="Select board"
          value={form.board || null}
          onChange={(key: Key | null) =>
            setForm((p) => ({ ...p, board: String(key ?? "") as AcademicInfoData["board"] }))
          }
        >
          <Label>Board</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {BOARDS.map((b: string) => (
                <ListBox.Item key={b} id={b} textValue={b}>
                  {b}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          {errors["board"] && (
            <FieldError>{errors["board"]}</FieldError>
          )}
        </Select>

        <TextField
          isRequired
          type="number"
          isInvalid={!!errors["twelfthPercent"]}
          value={String(form.twelfthPercent)}
          onChange={(v) => setForm((p) => ({ ...p, twelfthPercent: v }))}
        >
          <Label>12th Percentage</Label>
          <Input placeholder="e.g. 85.50" />
          {errors["twelfthPercent"] ? (
            <FieldError>{errors["twelfthPercent"]}</FieldError>
          ) : (
            <Description>e.g. 85.50</Description>
          )}
        </TextField>

        <TextField
          isRequired
          isInvalid={!!errors["twelfthStream"]}
          value={form.twelfthStream}
          onChange={(v) => setForm((p) => ({ ...p, twelfthStream: v }))}
        >
          <Label>12th Stream</Label>
          <Input placeholder="e.g. Science, Commerce, Arts" />
          {errors["twelfthStream"] ? (
            <FieldError>{errors["twelfthStream"]}</FieldError>
          ) : (
            <Description>e.g. Science, Commerce, Arts</Description>
          )}
        </TextField>

        <TextField
          isRequired
          isInvalid={!!errors["schoolName"]}
          value={form.schoolName}
          onChange={(v) => setForm((p) => ({ ...p, schoolName: v }))}
        >
          <Label>School Name</Label>
          <Input placeholder="Enter your school name" />
          {errors["schoolName"] && (
            <FieldError>{errors["schoolName"]}</FieldError>
          )}
        </TextField>

        <TextField
          isInvalid={!!errors["udiseCode"]}
          value={form.udiseCode ?? ""}
          onChange={(v) => setForm((p) => ({ ...p, udiseCode: v }))}
        >
          <Label>UDISE Code</Label>
          <Input placeholder="School's UDISE code" />
          {errors["udiseCode"] ? (
            <FieldError>{errors["udiseCode"]}</FieldError>
          ) : (
            <Description>School's UDISE code (optional)</Description>
          )}
        </TextField>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          isPending={saveMutation.isPending}
          isDisabled={saveMutation.isPending}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color="current" size="sm" /> : null}
              {isPending ? "Saving…" : "Save & Continue"}
              {!isPending && <ArrowRight className="size-4" />}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
