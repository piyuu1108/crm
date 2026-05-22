"use client";

import React, { useState, useEffect } from "react";
import {
  TextField,
  Label,
  Input,
  Description,
  FieldError,
  Button,
  Select,
  ListBox,
  Spinner,
  Alert,
  Separator,
  type Key,
} from "@heroui/react";
import { ArrowRight } from "@gravity-ui/icons";
import { useSaveStepMutation, type ProfileData } from "@/app/lib/queries/profile";
import {
  validateStep2,
  ADDRESS_KINDS,
  type ContactInfoData,
  type StudentAddressData,
  type AddressKind,
  type ValidationError,
} from "@/app/lib/validations/profile";

const ADDRESS_KIND_LABELS: Record<AddressKind, string> = {
  home: "Home",
  hostel: "Hostel",
  pg: "PG (Paying Guest)",
  relative: "Relative's House",
};

const NEEDS_HOME_ADDRESS: AddressKind[] = ["hostel", "pg"];

interface StepContactProps {
  profile: ProfileData;
  onSaved: () => void;
  onSaving: (saving: boolean) => void;
}

function emptyAddress(): StudentAddressData {
  return {
    current: { line1: "", city: "", pincode: "", kind: "home" },
  };
}

export function StepContact({ profile, onSaved, onSaving }: StepContactProps) {
  const saveMutation = useSaveStepMutation();

  const [form, setForm] = useState<ContactInfoData>({
    mobile: profile.mobile || "",
    parentMobile: profile.parentMobile || "",
    optionalMobile: profile.optionalMobile || "",
    address: profile.address ?? emptyAddress(),
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
      address: profile.address ?? emptyAddress(),
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

  const setCurrentAddr = (patch: Partial<StudentAddressData["current"]>) =>
    setForm((p) => ({
      ...p,
      address: { ...p.address, current: { ...p.address.current, ...patch } },
    }));

  const setHomeAddr = (patch: Partial<NonNullable<StudentAddressData["home"]>>) =>
    setForm((p) => ({
      ...p,
      address: {
        ...p.address,
        home: { line1: "", city: "", pincode: "", ...p.address.home, ...patch },
      },
    }));

  const needsHome = NEEDS_HOME_ADDRESS.includes(form.address.current.kind);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = validateStep2(form);
    setErrors(result.errors);
    if (!result.valid) return;

    onSaving(true);
    try {
      await saveMutation.mutateAsync({ step: 2, data: form as unknown as Record<string, unknown> });
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

      {/* ── Phone numbers ─────────────────────────────────────────── */}
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
      </div>

      <Separator />

      {/* ── Current / Stay Address ────────────────────────────────── */}
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Current / Stay Address</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Address Kind */}
          <div className="sm:col-span-2">
            <Select
              isRequired
              isInvalid={!!getFieldError("address.current.kind")}
              value={form.address.current.kind || null}
              onChange={(key: Key | null) => {
                const kind = String(key ?? "home") as AddressKind;
                setCurrentAddr({ kind });
                // Clear home address when switching to non-hostel/pg kind
                if (!NEEDS_HOME_ADDRESS.includes(kind)) {
                  setForm((p) => ({ ...p, address: { ...p.address, home: undefined } }));
                }
              }}
            >
              <Label>Address Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {ADDRESS_KINDS.map((k) => (
                    <ListBox.Item key={k} id={k}>
                      {ADDRESS_KIND_LABELS[k]}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              {getFieldError("address.current.kind") && (
                <FieldError>{getFieldError("address.current.kind")}</FieldError>
              )}
            </Select>
          </div>

          {/* Line 1 */}
          <div className="sm:col-span-2">
            <TextField
              isRequired
              isInvalid={!!getFieldError("address.current.line1")}
              value={form.address.current.line1}
              onChange={(v) => setCurrentAddr({ line1: v })}
            >
              <Label>
                {form.address.current.kind === "hostel"
                  ? "Hostel Name & Room No."
                  : form.address.current.kind === "pg"
                  ? "PG Address"
                  : "Address Line 1"}
              </Label>
              <Input placeholder="Building / street / locality" />
              {getFieldError("address.current.line1") && (
                <FieldError>{getFieldError("address.current.line1")}</FieldError>
              )}
            </TextField>
          </div>

          {/* City */}
          <TextField
            isRequired
            isInvalid={!!getFieldError("address.current.city")}
            value={form.address.current.city}
            onChange={(v) => setCurrentAddr({ city: v })}
          >
            <Label>City</Label>
            <Input placeholder="e.g. Ahmedabad" />
            {getFieldError("address.current.city") && (
              <FieldError>{getFieldError("address.current.city")}</FieldError>
            )}
          </TextField>

          {/* Pincode */}
          <TextField
            isRequired
            isInvalid={!!getFieldError("address.current.pincode")}
            value={form.address.current.pincode}
            onChange={(v) => setCurrentAddr({ pincode: v.replace(/\D/g, "").slice(0, 6) })}
          >
            <Label>Pincode</Label>
            <Input placeholder="6-digit pincode" maxLength={6} inputMode="numeric" />
            {getFieldError("address.current.pincode") ? (
              <FieldError>{getFieldError("address.current.pincode")}</FieldError>
            ) : (
              <Description>6-digit Indian pincode</Description>
            )}
          </TextField>
        </div>
      </div>

      {/* ── Home Address (only for hostel / PG) ──────────────────── */}
      {needsHome && (
        <>
          <Separator />
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">Permanent Home Address</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Required for hostel / PG residents — your parents' / permanent address.
            </p>
            {getFieldError("address.home.line1") && !form.address.home && (
              <Alert status="warning" className="mb-3">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>Please fill in your permanent home address.</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField
                  isRequired
                  isInvalid={!!getFieldError("address.home.line1")}
                  value={form.address.home?.line1 ?? ""}
                  onChange={(v) => setHomeAddr({ line1: v })}
                >
                  <Label>Home Address Line 1</Label>
                  <Input placeholder="Building / street / village" />
                  {getFieldError("address.home.line1") && (
                    <FieldError>{getFieldError("address.home.line1")}</FieldError>
                  )}
                </TextField>
              </div>

              <TextField
                isRequired
                isInvalid={!!getFieldError("address.home.city")}
                value={form.address.home?.city ?? ""}
                onChange={(v) => setHomeAddr({ city: v })}
              >
                <Label>Home City</Label>
                <Input placeholder="e.g. Surat" />
                {getFieldError("address.home.city") && (
                  <FieldError>{getFieldError("address.home.city")}</FieldError>
                )}
              </TextField>

              <TextField
                isRequired
                isInvalid={!!getFieldError("address.home.pincode")}
                value={form.address.home?.pincode ?? ""}
                onChange={(v) => setHomeAddr({ pincode: v.replace(/\D/g, "").slice(0, 6) })}
              >
                <Label>Home Pincode</Label>
                <Input placeholder="6-digit pincode" maxLength={6} inputMode="numeric" />
                {getFieldError("address.home.pincode") ? (
                  <FieldError>{getFieldError("address.home.pincode")}</FieldError>
                ) : (
                  <Description>6-digit Indian pincode</Description>
                )}
              </TextField>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* ── Aadhaar ───────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
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
