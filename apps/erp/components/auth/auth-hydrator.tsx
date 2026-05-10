"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner, Button } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useAuthMeQuery, authMeQueryKey } from "@/app/lib/queries/auth";

const HYDRATION_TIMEOUT_MS = 6000;

function useTimeout(ms: number, active: boolean): boolean {
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      const resetTimer = setTimeout(() => setExpired(false), 0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return () => clearTimeout(resetTimer);
    }

    timerRef.current = setTimeout(() => setExpired(true), ms);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [active, ms]);

  return active ? expired : false;
}

function HydrationFailure({
  message,
  onRetry,
  onLogin,
}: {
  message: string;
  onRetry: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex max-w-md flex-col items-center gap-5 px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-danger/10">
          <span className="text-3xl">!</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Unable to load your session
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onPress={onRetry}>
            Retry
          </Button>
          <Button variant="ghost" size="sm" onPress={onLogin}>
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AuthHydrator({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    user,
    isHydrated,
    hydrateFromStorage,
    hydrateUser,
    logout,
  } = useAuthStore();

  const { data, isError, error, refetch } = useAuthMeQuery();

  const isWaiting = !user || !isHydrated;
  const hasTimedOut = useTimeout(HYDRATION_TIMEOUT_MS, isWaiting);

  const handleRouteResync = useCallback(() => {
    queryClient.removeQueries({ queryKey: authMeQueryKey });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void refetch();
    router.refresh();
  }, [queryClient, refetch, router]);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!data) return;

    hydrateUser({
      id: data.id,
      name: data.name,
      email: data.email,
      roles: data.roles,
      facultyCode: data.facultyCode,
      profilePhoto: data.profilePhoto,
    });
  }, [data, hydrateUser]);

  useEffect(() => {
    if (!isError) return;

    const is401 =
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("401"));

    if (!is401) return;

    logout();
    queryClient.removeQueries({ queryKey: authMeQueryKey });
    router.replace("/auth/login");
  }, [error, isError, logout, queryClient, router]);

  useEffect(() => {
    const handleHistoryNavigation = () => {
      handleRouteResync();
    };

    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, [handleRouteResync]);

  const handleRetry = useCallback(() => {
    handleRouteResync();
  }, [handleRouteResync]);

  const handleGoLogin = useCallback(() => {
    logout();
    queryClient.removeQueries({ queryKey: authMeQueryKey });
    router.replace("/auth/login");
  }, [logout, queryClient, router]);

  if (isHydrated && user) {
    return <>{children}</>;
  }

  if (hasTimedOut) {
    const timeoutMessage = isError
      ? error instanceof Error
        ? error.message
        : "Server returned an error"
      : "Session validation is taking too long. Retry will refresh and re-sync the route.";

    return (
      <HydrationFailure
        message={timeoutMessage}
        onRetry={handleRetry}
        onLogin={handleGoLogin}
      />
    );
  }

  if (isError && !user) {
    const is401 =
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("401"));

    if (is401) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Spinner size="lg" color="accent" />
        </div>
      );
    }

    return (
      <HydrationFailure
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        }
        onRetry={handleRetry}
        onLogin={handleGoLogin}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" color="accent" />
        <p className="animate-pulse text-sm text-muted-foreground">
          Loading your workspace...
        </p>
      </div>
    </div>
  );
}
