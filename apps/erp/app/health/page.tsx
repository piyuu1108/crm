"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  Card,
  Chip,
  Spinner,
} from "@heroui/react";
import { fetchWithTimeout } from "@/app/lib/http";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ServiceStatus {
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}

interface HealthResponse {
  success: boolean;
  data: {
    db: ServiceStatus;
    redis: ServiceStatus;
    s3: ServiceStatus;
  };
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Service metadata for display
// ---------------------------------------------------------------------------
const SERVICES: {
  key: keyof HealthResponse["data"];
  name: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "db",
    name: "Neon PostgreSQL",
    description: "Serverless database via HTTP driver",
    icon: (
      <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    key: "redis",
    name: "Upstash Redis",
    description: "Rate limiting & short-lived cache",
    icon: (
      <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
      </svg>
    ),
  },
  {
    key: "s3",
    name: "S3 / MinIO",
    description: "Object storage for file uploads",
    icon: (
      <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// HealthPage
// ---------------------------------------------------------------------------
export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout("/api/health", {
        timeoutMs: 6000,
        timeoutMessage: "Health check timed out. Please retry.",
      });
      const json: HealthResponse = await res.json();
      setHealth(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach health API");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-check on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runCheck();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [runCheck]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              System Health
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Real-time status of all backend services
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={loading}
            isPending={loading}
            onPress={runCheck}
          >
            {({ isPending }) => (
              <>
                {isPending && <Spinner color="current" size="sm" />}
                {isPending ? "Checking…" : "Re-check"}
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* Overall status banner */}
        {health && (
          <div
            className={`mb-8 flex items-center gap-3 rounded-xl border px-5 py-4 ${
              health.success
                ? "border-green-500/30 bg-green-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                health.success
                  ? "bg-green-500/15 text-green-600"
                  : "bg-amber-500/15 text-amber-600"
              }`}
            >
              {health.success ? (
                <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {health.success ? "All Systems Operational" : "Some Services Degraded"}
              </p>
              <p className="text-xs text-muted">
                Last checked: {new Date(health.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4">
            <p className="text-sm font-medium text-red-600">
              Failed to reach health endpoint
            </p>
            <p className="mt-1 text-xs text-muted">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !health && (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Spinner size="lg" />
            <p className="text-sm text-muted">Checking service connections…</p>
          </div>
        )}

        {/* Service cards */}
        {health && (
          <div className="grid gap-4 sm:grid-cols-3">
            {SERVICES.map((svc) => {
              const status = health.data[svc.key];
              const isOk = status.status === "ok";

              return (
                <Card key={svc.key} className="relative overflow-hidden">
                  {/* Top accent stripe */}
                  <div
                    className={`absolute inset-x-0 top-0 h-1 ${
                      isOk ? "bg-green-500" : "bg-red-500"
                    }`}
                  />

                  <Card.Header className="flex flex-row items-start gap-3 pt-5">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        isOk
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {svc.icon}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Card.Title className="text-sm font-semibold">
                        {svc.name}
                      </Card.Title>
                      <Card.Description className="text-xs text-muted">
                        {svc.description}
                      </Card.Description>
                    </div>
                  </Card.Header>

                  <Card.Content className="flex flex-col gap-3 pt-2">
                    {/* Status chip */}
                    <div className="flex items-center gap-2">
                      <Chip
                        variant={isOk ? "secondary" : "secondary"}
                        className={`h-6 text-xs font-medium ${
                          isOk
                            ? "bg-green-500/10 text-green-700"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {isOk ? "✓ Connected" : "✗ Error"}
                      </Chip>
                    </div>

                    {/* Latency */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Latency</span>
                      <span className="font-mono font-medium text-foreground">
                        {status.latencyMs}ms
                      </span>
                    </div>

                    {/* Error detail */}
                    {status.error && (
                      <div className="rounded-lg bg-red-500/5 px-3 py-2">
                        <p className="break-all text-xs text-red-500">
                          {status.error}
                        </p>
                      </div>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
          </div>
        )}

        {/* Environment info */}
        {health && (
          <div className="mt-8 rounded-xl border border-border p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Connection Info
            </h2>
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted">Database</span>
                <span className="font-mono text-foreground">
                  Neon PostgreSQL (HTTP)
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted">Cache</span>
                <span className="font-mono text-foreground">
                  Upstash Redis (REST)
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted">Storage</span>
                <span className="font-mono text-foreground">
                  S3-compatible (MinIO)
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
