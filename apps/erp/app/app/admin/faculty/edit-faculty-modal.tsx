"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Description,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { useUpdateFacultyMutation, type FacultyListItem } from "@/app/lib/queries/faculty";

interface EditFacultyModalProps {
  faculty: FacultyListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM = {
  facultyCode: "",
  name: "",
  email: "",
  mobile: "",
  designation: "",
};

type FormErrors = Partial<Record<keyof typeof INITIAL_FORM, string>>;

export function EditFacultyModal({ faculty, isOpen, onClose }: EditFacultyModalProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const mutation = useUpdateFacultyMutation();

  useEffect(() => {
    if (faculty && isOpen) {
      setForm({
        facultyCode: faculty.facultyCode || "",
        name: faculty.name || "",
        email: faculty.email || "",
        mobile: faculty.mobile || "",
        designation: faculty.designation || "",
      });
      setErrors({});
    }
  }, [faculty, isOpen]);

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
    if (!validate() || !faculty) return;

    try {
      const result = await mutation.mutateAsync({
        id: faculty.id,
        facultyCode: form.facultyCode.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        designation: form.designation.trim() || undefined,
      });

      toast.success("Faculty updated", {
        description: `${result.name} has been updated successfully.`,
      });

      handleClose();
    } catch (err) {
      const serverErrors = (err as Error & { errors?: FormErrors }).errors;
      if (serverErrors) {
        setErrors(serverErrors);
      } else {
        toast.danger("Failed to update faculty", {
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
          <Modal.Dialog className="w-full max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Edit Faculty</h2>
            <p className="text-sm font-normal text-muted-foreground">
              Update details for {faculty?.name}
            </p>
          </div>
        </Modal.Header>

        <Modal.Body>
          <form id="edit-faculty-form" className="flex flex-col gap-4 py-2" onSubmit={handleSubmit}>
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
              {errors.facultyCode && <FieldError>{errors.facultyCode}</FieldError>}
            </TextField>

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
              <Input placeholder="e.g. kajal@college.edu" variant="secondary" />
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </TextField>

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

            <TextField
              fullWidth
              name="designation"
              value={form.designation}
              onChange={(v) => updateField("designation", v)}
              isInvalid={!!errors.designation}
            >
              <Label>Designation</Label>
              <Input placeholder="e.g. Assistant Professor" variant="secondary" />
              {errors.designation && <FieldError>{errors.designation}</FieldError>}
            </TextField>
          </form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onPress={handleClose} isDisabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="edit-faculty-form" isPending={mutation.isPending}>
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
