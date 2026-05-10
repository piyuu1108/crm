"use client";

import React, { useState } from "react";
import {
  Button,
  Drawer,
  Description,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import type { UseOverlayStateReturn } from "@heroui/react";
import { useCreateFacultyMutation } from "@/app/lib/queries/faculty";

interface AddFacultyDrawerProps {
  state: UseOverlayStateReturn;
}

const INITIAL_FORM = {
  facultyCode: "",
  name: "",
  email: "",
  mobile: "",
  designation: "",
};

type FormErrors = Partial<Record<keyof typeof INITIAL_FORM, string>>;

export function AddFacultyDrawer({ state }: AddFacultyDrawerProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const mutation = useCreateFacultyMutation();

  const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};

    if (!form.facultyCode.trim()) {
      e.facultyCode = "Faculty code is required";
    } else if (form.facultyCode.trim().length > 20) {
      e.facultyCode = "Max 20 characters";
    }

    if (!form.name.trim()) {
      e.name = "Full name is required";
    } else if (form.name.trim().length > 100) {
      e.name = "Max 100 characters";
    }

    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email.trim())) {
      e.email = "Invalid email format";
    }

    if (!form.mobile.trim()) {
      e.mobile = "Mobile number is required";
    } else if (!/^\d{10,15}$/.test(form.mobile.trim())) {
      e.mobile = "Must be 10–15 digits";
    }

    if (form.designation.trim().length > 100) {
      e.designation = "Max 100 characters";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await mutation.mutateAsync({
        facultyCode: form.facultyCode.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        designation: form.designation.trim() || undefined,
      });

      toast.success("Faculty created", {
        description: `${result.name} (${result.facultyCode}) has been added successfully`,
      });

      // Reset and close
      setForm(INITIAL_FORM);
      setErrors({});
      state.close();
    } catch (err) {
      // Extract server-side field errors if present
      const serverErrors = (err as Error & { errors?: FormErrors }).errors;
      if (serverErrors) {
        setErrors(serverErrors);
      } else {
        toast.danger("Failed to create faculty", {
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
              <Drawer.Heading>Add Faculty Member</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body>
              <form
                id="add-faculty-form"
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
              >
                {/* Faculty Code */}
                <TextField
                  fullWidth
                  isRequired
                  name="facultyCode"
                  value={form.facultyCode}
                  onChange={(v) => updateField("facultyCode", v)}
                  isInvalid={!!errors.facultyCode}
                >
                  <Label>Faculty Code</Label>
                  <Input placeholder="e.g. FAC001" variant="secondary" />
                  <Description>
                    Unique identifier — also used as the temporary password
                  </Description>
                  {errors.facultyCode && (
                    <FieldError>{errors.facultyCode}</FieldError>
                  )}
                </TextField>

                {/* Full Name */}
                <TextField
                  fullWidth
                  isRequired
                  name="name"
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                  isInvalid={!!errors.name}
                >
                  <Label>Full Name</Label>
                  <Input placeholder="e.g. Kajal Patel" variant="secondary" />
                  {errors.name && <FieldError>{errors.name}</FieldError>}
                </TextField>

                {/* Email */}
                <TextField
                  fullWidth
                  isRequired
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(v) => updateField("email", v)}
                  isInvalid={!!errors.email}
                >
                  <Label>Email</Label>
                  <Input
                    placeholder="e.g. kajal@college.edu"
                    variant="secondary"
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </TextField>

                {/* Mobile */}
                <TextField
                  fullWidth
                  isRequired
                  name="mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={(v) => updateField("mobile", v)}
                  isInvalid={!!errors.mobile}
                >
                  <Label>Mobile Number</Label>
                  <Input placeholder="e.g. 9876543210" variant="secondary" />
                  {errors.mobile && <FieldError>{errors.mobile}</FieldError>}
                </TextField>

                {/* Designation (optional) */}
                <TextField
                  fullWidth
                  name="designation"
                  value={form.designation}
                  onChange={(v) => updateField("designation", v)}
                  isInvalid={!!errors.designation}
                >
                  <Label>Designation</Label>
                  <Input
                    placeholder="e.g. Assistant Professor"
                    variant="secondary"
                  />
                  <Description>Optional — can be updated later</Description>
                  {errors.designation && (
                    <FieldError>{errors.designation}</FieldError>
                  )}
                </TextField>
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
                form="add-faculty-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Creating…" : "Create Faculty"}
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
