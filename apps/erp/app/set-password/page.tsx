"use client";

export const dynamic = "force-dynamic";

import React, { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Spinner,
  toast,
} from "@heroui/react";
import { Eye, EyeSlash, Lock } from "@gravity-ui/icons";
import { fetchWithTimeout } from "@/app/lib/http";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Decode the token — URL encoding must be reversed
  const token = useMemo(() => {
    const raw = searchParams.get("token") ?? "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }, [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};
    if (!newPassword) errs.newPassword = "New password is required";
    else if (newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Confirm password is required";
    else if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    console.log("[set-password] Submitting token length:", token.length);

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

  const isValidLength = newPassword.length >= 8;
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = token.length > 0 && isValidLength && isMatch && !isSubmitting;

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

        {/* Native form — avoids HeroUI Form's React Aria intercept */}
        <form id="set-password-form" onSubmit={handleSubmit} noValidate>
          <Card.Content className="flex flex-col gap-5 px-8 pt-4">
            {token.length === 0 && (
              <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                Invalid setup link. Please request a new password setup email.
              </p>
            )}

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                New Password <span className="text-danger">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-muted">
                  <Lock className="size-4" />
                </span>
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }}
                  placeholder="Enter new password"
                  className="w-full rounded-lg border border-divider bg-background px-4 py-2.5 pl-9 pr-10 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 text-muted hover:text-foreground transition-colors"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.newPassword && (
                <p className="text-xs text-danger">{fieldErrors.newPassword}</p>
              )}
              {newPassword.length > 0 && !fieldErrors.newPassword && (
                <p className={`text-xs ${isValidLength ? "text-success" : "text-muted"}`}>
                  {isValidLength ? "✓ At least 8 characters" : "Must be at least 8 characters"}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm Password <span className="text-danger">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-muted">
                  <Lock className="size-4" />
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg border border-divider bg-background px-4 py-2.5 pl-9 pr-10 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 text-muted hover:text-foreground transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-danger">{fieldErrors.confirmPassword}</p>
              )}
              {confirmPassword.length > 0 && !fieldErrors.confirmPassword && isMatch && (
                <p className="text-xs text-success">✓ Passwords match</p>
              )}
            </div>
          </Card.Content>

          <Card.Footer className="px-8 pb-8 pt-2">
            <Button
              fullWidth
              type="submit"
              form="set-password-form"
              isDisabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Spinner color="current" size="sm" />
                  Saving…
                </>
              ) : (
                "Set Password"
              )}
            </Button>
          </Card.Footer>
        </form>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
