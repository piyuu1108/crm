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
  PersonalInfoSchema,
  GENDERS,
  BLOOD_GROUPS,
  type PersonalInfoData,
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
    gender: (profile.gender || "") as PersonalInfoData["gender"],
    bloodGroup: (profile.bloodGroup || undefined) as PersonalInfoData["bloodGroup"],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Sync when profile data changes
  useEffect(() => {
    setForm({
      fullName: profile.fullName || "",
      dob: profile.dob || "",
      gender: (profile.gender || "") as PersonalInfoData["gender"],
      bloodGroup: (profile.bloodGroup || undefined) as PersonalInfoData["bloodGroup"],
    });
  }, [profile.fullName, profile.dob, profile.gender, profile.bloodGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Client validation
    const parsed = PersonalInfoSchema.safeParse(form);
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
            isInvalid={!!errors["fullName"]}
            value={form.fullName}
            onChange={(v) => setForm((p) => ({ ...p, fullName: v }))}
          >
            <Label>Full Name</Label>
            <Input placeholder="Enter your full name" />
            {errors["fullName"] ? (
              <FieldError>{errors["fullName"]}</FieldError>
            ) : (
              <Description>As per official records</Description>
            )}
          </TextField>
        </div>

        <TextField
          isRequired
          type="date"
          isInvalid={!!errors["dob"]}
          value={form.dob}
          onChange={(v) => setForm((p) => ({ ...p, dob: v }))}
        >
          <Label>Date of Birth</Label>
          <Input />
          {errors["dob"] && (
            <FieldError>{errors["dob"]}</FieldError>
          )}
        </TextField>

        <Select
          isRequired
          isInvalid={!!errors["gender"]}
          placeholder="Select gender"
          value={form.gender || null}
          onChange={(key: Key | null) =>
            setForm((p) => ({ ...p, gender: String(key ?? "") as PersonalInfoData["gender"] }))
          }
        >
          <Label>Gender</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {GENDERS.map((g: string) => (
                <ListBox.Item key={g} id={g} textValue={g}>
                  <span className="capitalize">{g}</span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          {errors["gender"] && (
            <FieldError>{errors["gender"]}</FieldError>
          )}
        </Select>

        <Select
          isInvalid={!!errors["bloodGroup"]}
          placeholder="Select blood group"
          value={form.bloodGroup || null}
          onChange={(key: Key | null) =>
            setForm((p) => ({ ...p, bloodGroup: String(key ?? "") as PersonalInfoData["bloodGroup"] }))
          }
        >
          <Label>Blood Group</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {BLOOD_GROUPS.map((bg: string) => (
                <ListBox.Item key={bg} id={bg} textValue={bg}>
                  {bg}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          {errors["bloodGroup"] && (
            <FieldError>{errors["bloodGroup"]}</FieldError>
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
