"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";

interface EditStudentModalProps {
  student: { id: number; fullName: string; email: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (fullName: string, email: string) => Promise<void>;
}

const INITIAL_FORM = {
  fullName: "",
  email: "",
};

type FormErrors = Partial<Record<keyof typeof INITIAL_FORM, string>>;

export function EditStudentModal({ student, isOpen, onClose, onSave }: EditStudentModalProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student && isOpen) {
      setForm({
        fullName: student.fullName || "",
        email: student.email || "",
      });
      setErrors({});
    }
  }, [student, isOpen]);

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

    if (!form.fullName.trim()) {
      e.fullName = "Full name is required";
    } else if (form.fullName.trim().length > 150) {
      e.fullName = "Max 150 characters";
    }

    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email.trim())) {
      e.email = "Invalid email format";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate() || !student) return;

    setIsSaving(true);
    try {
      await onSave(form.fullName.trim(), form.email.trim());
      toast.success("Student profile updated successfully.");
      handleClose();
    } catch (err) {
      toast.danger("Failed to update student profile", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
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
                <h2 className="text-lg font-semibold">Edit Student Profile</h2>
                <p className="text-sm font-normal text-muted-foreground">
                  Update name or email for this student.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body>
              <form id="edit-student-form" className="flex flex-col gap-4 py-2" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  isRequired
                  name="fullName"
                  value={form.fullName}
                  onChange={(v) => updateField("fullName", v)}
                  isInvalid={!!errors.fullName}
                >
                  <Label>Full Name</Label>
                  <Input placeholder="e.g. Kajal Patel" variant="secondary" />
                  {errors.fullName && <FieldError>{errors.fullName}</FieldError>}
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
              </form>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose} isDisabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" form="edit-student-form" isPending={isSaving}>
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
