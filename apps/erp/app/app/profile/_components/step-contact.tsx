"use client";

import React, { useState, useEffect } from "react";
import {
  TextField,
  Label,
  Input,
  TextArea,
  Description,
  FieldError,
  Button,
  Spinner,
  Alert,
} from "@heroui/react";
import { ArrowRight } from "@gravity-ui/icons";
import { useSaveStepMutation, type ProfileData } from "@/app/lib/queries/profile";
import {
  validateStep2,
  type ContactInfoData,
  type ValidationError,
} from "@/app/lib/validations/profile";

interface StepContactProps {
  profile: ProfileData;
  onSaved: () => void;
  onSaving: (saving: boolean) => void;
}

export function StepContact({ profile, onSaved, onSaving }: StepContactProps) {
  const saveMutation = useSaveStepMutation();

  const [form, setForm] = useState<ContactInfoData>({
    mobile: profile.mobile || "",
    parentMobile: profile.parentMobile || "",
    optionalMobile: profile.optionalMobile || "",
    address: profile.address || "",
    aadhaarStudent: profile.aadhaarStudent || "",
    aadhaarParent: profile.aadhaarParent || "",
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      mobile: profile.mobile || "",
      parentMobile: profile.parentMobile || "",
      optionalMobile: profile.optionalMobile || "",
      address: profile.address || "",
      aadhaarStudent: profile.aadhaarStudent || "",
      aadhaarParent: profile.aadhaarParent || "",
    });
  }, [
    profile.mobile,
    profile.parentMobile,
    profile.optionalMobile,
    profile.address,
    profile.aadhaarStudent,
    profile.aadhaarParent,
  ]);

  const getFieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = validateStep2(form);
    setErrors(result.errors);
    if (!result.valid) return;

    onSaving(true);
    try {
      await saveMutation.mutateAsync({ step: 2, data: { ...form } as unknown as Record<string, unknown> });
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
        <TextField
          isRequired
          isInvalid={!!getFieldError("mobile")}
          value={form.mobile}
          onChange={(v) => setForm((p) => ({ ...p, mobile: v }))}
        >
          <Label>Mobile Number</Label>
          <Input placeholder="10-digit number" maxLength={10} />
          {getFieldError("mobile") ? (
            <FieldError>{getFieldError("mobile")}</FieldError>
          ) : (
            <Description>10-digit number</Description>
          )}
        </TextField>

        <TextField
          isInvalid={!!getFieldError("parentMobile")}
          value={form.parentMobile ?? ""}
          onChange={(v) => setForm((p) => ({ ...p, parentMobile: v }))}
        >
          <Label>Parent Mobile</Label>
          <Input placeholder="10-digit number" maxLength={10} />
          {getFieldError("parentMobile") && (
            <FieldError>{getFieldError("parentMobile")}</FieldError>
          )}
        </TextField>

        <TextField
          isInvalid={!!getFieldError("optionalMobile")}
          value={form.optionalMobile ?? ""}
          onChange={(v) => setForm((p) => ({ ...p, optionalMobile: v }))}
        >
          <Label>Optional Mobile</Label>
          <Input placeholder="10-digit number" maxLength={10} />
          {getFieldError("optionalMobile") && (
            <FieldError>{getFieldError("optionalMobile")}</FieldError>
          )}
        </TextField>

        <div className="sm:col-span-2">
          <TextField
            isRequired
            isInvalid={!!getFieldError("address")}
            value={form.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
          >
            <Label>Address</Label>
            <TextArea placeholder="Enter your full address" rows={3} />
            {getFieldError("address") && (
              <FieldError>{getFieldError("address")}</FieldError>
            )}
          </TextField>
        </div>

        <TextField
          isInvalid={!!getFieldError("aadhaarStudent")}
          value={form.aadhaarStudent ?? ""}
          onChange={(v) => setForm((p) => ({ ...p, aadhaarStudent: v }))}
        >
          <Label>Student Aadhaar Number</Label>
          <Input placeholder="12-digit Aadhaar" maxLength={12} />
          {getFieldError("aadhaarStudent") ? (
            <FieldError>{getFieldError("aadhaarStudent")}</FieldError>
          ) : (
            <Description>12-digit Aadhaar</Description>
          )}
        </TextField>

        <TextField
          isInvalid={!!getFieldError("aadhaarParent")}
          value={form.aadhaarParent ?? ""}
          onChange={(v) => setForm((p) => ({ ...p, aadhaarParent: v }))}
        >
          <Label>Parent Aadhaar Number</Label>
          <Input placeholder="12-digit Aadhaar" maxLength={12} />
          {getFieldError("aadhaarParent") ? (
            <FieldError>{getFieldError("aadhaarParent")}</FieldError>
          ) : (
            <Description>12-digit Aadhaar</Description>
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
