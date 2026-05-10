"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional fallback UI. If not provided, a default recovery UI is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary — catches uncaught React errors and renders
 * a recovery UI instead of a blank screen.
 *
 * Place this in the root Providers or layout to catch errors from
 * any child component tree.
 *
 * This is a class component because React error boundaries
 * require getDerivedStateFromError and componentDidCatch.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development; in production, send to logging service
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/app/dashboard";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-5 text-center max-w-lg px-6">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-danger/10">
              <span className="text-3xl">💥</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Something went wrong
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                An unexpected error occurred. You can try recovering or reload
                the page.
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-default/10 p-3 text-left text-xs text-danger font-mono">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack?.split("\n").slice(0, 5).join("\n")}
                </pre>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-xl border border-divider bg-background px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default/40"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
