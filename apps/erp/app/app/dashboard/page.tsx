"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner, Card, Button } from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  useDashboardQuery,
  dashboardQueryKey,
} from "@/app/lib/queries/dashboard";
import type {
  StudentDashboardData,
  FacultyDashboardData,
  CounselorDashboardData,
  HodDashboardData,
} from "@/app/lib/queries/dashboard";

const StudentDashboard = dynamic(
  () =>
    import("./components/student-dashboard").then((m) => ({
      default: m.StudentDashboard,
    })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const FacultyDashboard = dynamic(
  () =>
    import("./components/faculty-dashboard").then((m) => ({
      default: m.FacultyDashboard,
    })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const CounselorDashboard = dynamic(
  () =>
    import("./components/counselor-dashboard").then((m) => ({
      default: m.CounselorDashboard,
    })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const HodDashboard = dynamic(
  () =>
    import("./components/hod-dashboard").then((m) => ({
      default: m.HodDashboard,
    })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-default/20" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-divider bg-default/10"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 h-64 animate-pulse rounded-xl border border-divider bg-default/10" />
        <div className="h-64 animate-pulse rounded-xl border border-divider bg-default/10" />
      </div>
    </div>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Card className="max-w-md w-full border border-danger/30 bg-danger/5 p-8 text-center">
        <Card.Content className="flex flex-col items-center gap-4">
          <div className="text-4xl">!</div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Failed to load dashboard
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
          <Button variant="secondary" onPress={onRetry}>
            Try Again
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
}

function RoleDashboard({
  role,
  data,
}: {
  role: string;
  data: unknown;
}) {
  switch (role) {
    case "student":
      return <StudentDashboard data={data as StudentDashboardData} />;
    case "faculty":
      return <FacultyDashboard data={data as FacultyDashboardData} />;
    case "counselor":
      return <CounselorDashboard data={data as CounselorDashboardData} />;
    case "hod":
      return <HodDashboard data={data as HodDashboardData} />;
    default:
      return (
        <div className="text-sm text-muted-foreground">
          Unknown role: {role}
        </div>
      );
  }
}

export default function DashboardPage() {
  const { activeRole } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } =
    useDashboardQuery(activeRole);

  const handleRecover = React.useCallback(() => {
    queryClient.removeQueries({ queryKey: dashboardQueryKey(activeRole) });
    void refetch();
    router.refresh();
  }, [activeRole, queryClient, refetch, router]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="accent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <DashboardError
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        }
        onRetry={handleRecover}
      />
    );
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="accent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return <RoleDashboard role={data.user.activeRole} data={data.dashboard} />;
}
