"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  FieldError,
  Form,
  InputGroup,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { Eye, EyeSlash, Lock } from "@gravity-ui/icons";
import { fetchWithTimeout } from "@/app/lib/http";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidLength = newPassword.length >= 8;
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = token.length > 0 && isValidLength && isMatch && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
        timeoutMs: 10000,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to set password");
      }

      toast.success("Password set successfully", {
        description: "You can now sign in using your new password.",
      });
      router.push("/auth/login");
    } catch (error) {
      toast.danger("Unable to set password", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[460px]">
        <Card.Header className="flex flex-col items-center gap-2 px-8 pt-8 pb-2">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Lock className="size-5" />
          </div>
          <Card.Title className="text-xl font-semibold tracking-tight">
            Set Your Password
          </Card.Title>
          <Card.Description className="text-center text-sm text-muted">
            Create a new password to activate your account
          </Card.Description>
        </Card.Header>

        <Form onSubmit={handleSubmit} validationBehavior="aria">
          <Card.Content className="flex flex-col gap-5 px-8 pt-4">
            {token.length === 0 && (
              <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                Invalid setup link. Please request a new password setup email.
              </p>
            )}

            <TextField
              fullWidth
              isRequired
              name="newPassword"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={setNewPassword}
              isInvalid={newPassword.length > 0 && !isValidLength}
              validate={(value) => {
                if (!value) return "New password is required";
                if (value.length < 8) return "Password must be at least 8 characters";
                return null;
              }}
            >
              <Label>New Password</Label>
              <InputGroup fullWidth>
                <InputGroup.Prefix>
                  <Lock className="size-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="Enter new password" />
                <InputGroup.Suffix className="pr-0">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={showNew ? "Hide password" : "Show password"}
                    onPress={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              <FieldError />
            </TextField>

            <TextField
              fullWidth
              isRequired
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              isInvalid={confirmPassword.length > 0 && !isMatch}
              validate={(value) => {
                if (!value) return "Confirm password is required";
                if (value !== newPassword) return "Passwords do not match";
                return null;
              }}
            >
              <Label>Confirm Password</Label>
              <InputGroup fullWidth>
                <InputGroup.Prefix>
                  <Lock className="size-4 text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="Re-enter password" />
                <InputGroup.Suffix className="pr-0">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onPress={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? (
                      <EyeSlash className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              <FieldError />
            </TextField>
          </Card.Content>

          <Card.Footer className="px-8 pb-8 pt-2">
            <Button fullWidth type="submit" isDisabled={!canSubmit} isPending={isSubmitting}>
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  {isPending ? "Saving…" : "Set Password"}
                </>
              )}
            </Button>
          </Card.Footer>
        </Form>
      </Card>
    </div>
  );
}
