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
  validateStep1,
  GENDERS,
  BLOOD_GROUPS,
  type PersonalInfoData,
  type ValidationError,
} from "@/app/lib/validations/profile";

interface StepPersonalProps {
  profile: ProfileData;
  onSaved: () => void;
  onSaving: (saving: boolean) => void;
}

export function StepPersonal({ profile, onSaved, onSaving }: StepPersonalProps) {
  const saveMutation = useSaveStepMutation();

  // Local form state — pre-populated from profile data
  const [form, setForm] = useState<PersonalInfoData>({
    fullName: profile.fullName || "",
    dob: profile.dob || "",
    gender: profile.gender || "",
    bloodGroup: profile.bloodGroup || "",
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // Sync when profile data changes
  useEffect(() => {
    setForm({
      fullName: profile.fullName || "",
      dob: profile.dob || "",
      gender: profile.gender || "",
      bloodGroup: profile.bloodGroup || "",
    });
  }, [profile.fullName, profile.dob, profile.gender, profile.bloodGroup]);

  const getFieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Client validation
    const result = validateStep1(form);
    setErrors(result.errors);
    if (!result.valid) return;

    onSaving(true);
    try {
      await saveMutation.mutateAsync({ step: 1, data: { ...form } as unknown as Record<string, unknown> });
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            isRequired
            isInvalid={!!getFieldError("fullName")}
            value={form.fullName}
            onChange={(v) => setForm((p) => ({ ...p, fullName: v }))}
          >
            <Label>Full Name</Label>
            <Input placeholder="Enter your full name" />
            {getFieldError("fullName") ? (
              <FieldError>{getFieldError("fullName")}</FieldError>
            ) : (
              <Description>As per official records</Description>
            )}
          </TextField>
        </div>

        <TextField
          isRequired
          type="date"
          isInvalid={!!getFieldError("dob")}
          value={form.dob}
          onChange={(v) => setForm((p) => ({ ...p, dob: v }))}
        >
          <Label>Date of Birth</Label>
          <Input />
          {getFieldError("dob") && (
            <FieldError>{getFieldError("dob")}</FieldError>
          )}
        </TextField>

        <Select
          isRequired
          isInvalid={!!getFieldError("gender")}
          placeholder="Select gender"
          value={form.gender || null}
          onChange={(key: Key | null) =>
            setForm((p) => ({ ...p, gender: String(key ?? "") }))
          }
        >
          <Label>Gender</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {GENDERS.map((g) => (
                <ListBox.Item key={g} id={g} textValue={g}>
                  <span className="capitalize">{g}</span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          {getFieldError("gender") && (
            <FieldError>{getFieldError("gender")}</FieldError>
          )}
        </Select>

        <Select
          isInvalid={!!getFieldError("bloodGroup")}
          placeholder="Select blood group"
          value={form.bloodGroup || null}
          onChange={(key: Key | null) =>
            setForm((p) => ({ ...p, bloodGroup: String(key ?? "") }))
          }
        >
          <Label>Blood Group</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {BLOOD_GROUPS.map((bg) => (
                <ListBox.Item key={bg} id={bg} textValue={bg}>
                  {bg}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          {getFieldError("bloodGroup") && (
            <FieldError>{getFieldError("bloodGroup")}</FieldError>
          )}
        </Select>

        {/* Email — read-only per SRS */}
        <TextField isReadOnly value={profile.email}>
          <Label>Email</Label>
          <Input />
          <Description>Pre-filled from registration. Cannot be changed.</Description>
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
