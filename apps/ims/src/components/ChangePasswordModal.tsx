"use client";
import { useState } from "react";
import { Button, Modal, TextField, Label, Input } from "@heroui/react";
import { ErrorAlert } from "@/components/ui/Alerts";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ isOpen, onSuccess }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldPassword, newPassword, confirmPassword }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to change password"); return; }
      onSuccess();
    } catch { setError("Network error."); } finally { setLoading(false); }
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={() => {}}>
      <Modal.Container placement="center">
        <Modal.Dialog className="sm:max-w-md">
          <Modal.Header>
            <Modal.Heading>Change Your Password</Modal.Heading>
            <p className="text-sm leading-5 text-muted">You must change your default password before accessing the system.</p>
          </Modal.Header>
          <Modal.Body>
            <ErrorAlert message={error} className="mb-4" />
            <form onSubmit={handleSubmit} id="change-password-form" className="flex flex-col gap-4">
              <TextField name="oldPassword" type="password" isRequired value={oldPassword} onChange={setOldPassword}>
                <Label>Current Password</Label>
                <Input placeholder="Enter current password" autoFocus />
              </TextField>
              <TextField name="newPassword" type="password" isRequired value={newPassword} onChange={setNewPassword}>
                <Label>New Password</Label>
                <Input placeholder="Enter new password" />
              </TextField>
              <TextField name="confirmPassword" type="password" isRequired value={confirmPassword} onChange={setConfirmPassword}>
                <Label>Confirm New Password</Label>
                <Input placeholder="Confirm new password" />
              </TextField>
            </form>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" form="change-password-form" fullWidth isDisabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
