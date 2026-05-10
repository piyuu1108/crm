"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toast } from "@heroui/react";
import { ThemeConfigProvider } from "./theme/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";

// Stable singleton — created once per app mount, not per render
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes — avoids refetch on every focus
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create new (though we are CSR-only)
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeConfigProvider>
        <ErrorBoundary>
          <Toast.Provider />
          {children}
        </ErrorBoundary>
      </ThemeConfigProvider>
    </QueryClientProvider>
  );
}
