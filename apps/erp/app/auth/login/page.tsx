"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Envelope, Lock, Eye, EyeSlash } from "@gravity-ui/icons";
import {
  Button,
  Card,
  Checkbox,
  FieldError,
  Form,
  InputGroup,
  Label,
  Link,
  Separator,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { authMeQueryKey } from "@/app/lib/queries/auth";
import { fetchWithTimeout } from "@/app/lib/http";

const ThemeSwitcher = dynamic(
  () => import("@/app/theme/theme-switcher"),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  // ── Clear zombie state on mount ─────────────────────────────────────────
  // When user navigates back to login (via back button, logout, or direct URL),
  // ensure all previous auth state is purged so the page is clean.
  useEffect(() => {
    logout();
    // Clear ALL auth-related query cache to prevent stale data
    queryClient.removeQueries({ queryKey: authMeQueryKey });
    queryClient.removeQueries({ queryKey: ["dashboard"] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional mount-only

  const isPasswordValid = password.length === 0 || password.length >= 6;
  const canSubmit =
    identifier.trim().length > 0 &&
    password.length > 0 &&
    password.length >= 6;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;

    setIsLoading(true);

    try {
      const res = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
        timeoutMs: 8000,
        timeoutMessage: "Login request timed out. Please try again.",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid credentials. Please try again.");
      }

      // Pre-populate auth store so dashboard renders instantly
      // (AuthHydrator will validate against server in background)
      useAuthStore.getState().hydrateUser({
        id: data.data.id,
        name: data.data.name,
        email: data.data.email,
        roles: data.data.roles,
        profilePhoto: data.data.profilePhoto,
      });

      toast.success("Welcome back!", {
        description: `Signed in as ${data.data.name || identifier}`,
      });

      // Full navigation to dashboard (cookie is already set by the API response)
      window.location.href = "/app/dashboard";
    } catch (err) {
      toast.danger("Authentication failed", {
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar with theme switcher */}
      <header className="flex w-full items-center justify-end px-6 py-4">
        <ThemeSwitcher />
      </header>

      {/* Centered card */}
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-[420px]">
          {/* ── Header ── */}
          <Card.Header className="flex flex-col items-center gap-2 px-8 pt-8 pb-2">
            {/* Logo / brand mark */}
            <div className="mb-2 flex size-12 items-center justify-center rounded-2xl text-accent-foreground">
              <img src="/logo1.png" alt="" className="h-12 w-12 object-contain" />
            </div>
            <Card.Title className="text-xl font-semibold tracking-tight">
              Sign in to your account
            </Card.Title>
            <Card.Description className="text-center text-sm text-muted">
              Enter your credentials to continue
            </Card.Description>
          </Card.Header>

          {/* ── Form ── */}
          <Form onSubmit={handleSubmit} validationBehavior="aria">
            <Card.Content className="flex flex-col gap-5 px-8 pt-4">
              {/* Email field */}
              <TextField
                fullWidth
                isRequired
                name="identifier"
                value={identifier}
                onChange={setIdentifier}
                validate={(value) => {
                  if (!value) return "Email or Student ID is required";
                  return null;
                }}
              >
                <Label>Email or Student ID</Label>
                <InputGroup fullWidth>
                  <InputGroup.Prefix>
                    <Envelope className="size-4 text-muted" />
                  </InputGroup.Prefix>
                  <InputGroup.Input placeholder="name@example.com or 26BCAAI001" />
                </InputGroup>
                <FieldError />
              </TextField>

              {/* Password field */}
              <TextField
                fullWidth
                isRequired
                name="password"
                type={isVisible ? "text" : "password"}
                value={password}
                onChange={setPassword}
                isInvalid={password.length > 0 && !isPasswordValid}
                validate={(value) => {
                  if (!value) return "Password is required";
                  if (value.length < 6)
                    return "Password must be at least 6 characters";
                  return null;
                }}
              >
                <Label>Password</Label>
                <InputGroup fullWidth>
                  <InputGroup.Prefix>
                    <Lock className="size-4 text-muted" />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    placeholder="••••••••"
                  />
                  <InputGroup.Suffix className="pr-0">
                    <Button
                      isIconOnly
                      aria-label={
                        isVisible ? "Hide password" : "Show password"
                      }
                      size="sm"
                      variant="ghost"
                      onPress={() => setIsVisible(!isVisible)}
                    >
                      {isVisible ? (
                        <EyeSlash className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </InputGroup.Suffix>
                </InputGroup>
                <FieldError />
              </TextField>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <Checkbox name="remember">
                  <span className="text-sm">Remember me</span>
                </Checkbox>
                <Link className="text-sm" href="#">
                  Forgot password?
                </Link>
              </div>
            </Card.Content>

            {/* ── Footer ── */}
            <Card.Footer className="flex flex-col gap-4 px-8 pt-2 pb-8">
              <Button
                fullWidth
                type="submit"
                isDisabled={!canSubmit || isLoading}
                isPending={isLoading}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Signing in…" : "Sign In"}
                  </>
                )}
              </Button>

              <Separator />

              <p className="text-center text-sm text-muted">
                Don&apos;t have an account?{" "}
                <Link className="font-medium" href="#">
                  Create account
                </Link>
              </p>
            </Card.Footer>
          </Form>
        </Card>
      </main>
    </div>
  );
}
