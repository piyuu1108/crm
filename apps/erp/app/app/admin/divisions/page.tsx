"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Chip,
  Pagination,
  useOverlayState,
} from "@heroui/react";
import { Plus } from "@gravity-ui/icons";
import {
  divisionListKey,
  useDivisionListQuery,
  type DivisionListParams,
} from "@/app/lib/queries/divisions";
import { CreateDivisionDrawer } from "./create-division-drawer";
import { sortDivisions } from "@/app/lib/utils/sort-utils";

// ─── Specialization badge colors ──────────────────────────────────────────────
const SPEC_COLOR: Record<string, "accent" | "success" | "warning"> = {
  AI: "accent",
  DS: "success",
  REGULAR: "warning",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function DivisionCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-48 rounded-2xl border border-divider bg-default/10 animate-pulse"
        />
      ))}
    </div>
  );
}

// ─── Semester display helper ──────────────────────────────────────────────────
function semesterLabel(semNo: number): string {
  if (semNo <= 2) return "FY";
  if (semNo <= 4) return "SY";
  return "TY";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DivisionsPage() {
  const [page, setPage] = useState(1);
  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();

  const params: DivisionListParams = { page, limit: 12 };
  const { data, isLoading, isError, error, refetch } =
    useDivisionListQuery(params);

  const handleRecover = useCallback(() => {
    queryClient.removeQueries({ queryKey: divisionListKey(params) });
    void refetch();
  }, [params, queryClient, refetch]);

  const totalPages = data?.pagination.totalPages ?? 1;
  const total = data?.pagination.total ?? 0;
  const start = data ? (page - 1) * (data.pagination.limit) + 1 : 0;
  const end = data ? Math.min(page * data.pagination.limit, total) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Divisions
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage academic divisions, upload students, and view details
          </p>
        </div>
        <Button onPress={drawerState.open}>
          <Plus className="size-4" />
          Create Division
        </Button>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {isLoading ? (
        <DivisionCardSkeleton />
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load divisions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </p>
            </div>
            <Button variant="secondary" onPress={handleRecover}>
              Try Again
            </Button>
          </Card.Content>
        </Card>
      ) : data && data.divisions.length === 0 ? (
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-5xl">🏫</div>
            <h2 className="text-lg font-semibold text-foreground">
              No divisions yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Create your first division to start organizing students by specialization and batch year.
            </p>
            <Button onPress={drawerState.open} className="mt-2">
              <Plus className="size-4" />
              Create Division
            </Button>
          </Card.Content>
        </Card>
      ) : data ? (
        <>
          {/* Result count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {total} division{total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Division Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortDivisions(data.divisions, (d) => d.displayName).map((div) => (
              <div
                key={div.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/app/admin/divisions/${div.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/app/admin/divisions/${div.id}`);
                  }
                }}
                className="group relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl"
              >
                <Card className="border border-divider transition-all duration-200 group-hover:border-accent/40 group-hover:shadow-lg group-hover:shadow-accent/5">
                <Card.Content className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold font-mono text-foreground group-hover:text-accent transition-colors">
                        {div.displayName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {semesterLabel(div.semesterNo)} · Sem {div.semesterNo}
                      </p>
                    </div>
                    <Chip
                      color={SPEC_COLOR[div.specialization] || "accent"}
                      size="sm"
                      variant="soft"
                    >
                      {div.specialization}
                    </Chip>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-lg bg-default/10 p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Batch Year
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {div.batchYear}
                      </p>
                    </div>
                    <div className="rounded-lg bg-default/10 p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Students
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {div.studentCount}
                      </p>
                    </div>
                  </div>

                  {/* Counselor */}
                  <div className="mt-3 pt-3 border-t border-divider">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Counselor:</span>{" "}
                      {div.counselorName || (
                        <span className="italic text-muted-foreground/60">
                          Not assigned
                        </span>
                      )}
                    </p>
                  </div>
                </Card.Content>
              </Card>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination size="sm">
                <Pagination.Summary>
                  {start} to {end} of {total} results
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={page === 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Pagination.PreviousIcon />
                      Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={page === p}
                          onPress={() => setPage(p)}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={page === totalPages}
                      onPress={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </>
      ) : null}

      {/* ── Create Division Drawer ─────────────────────────────── */}
      <CreateDivisionDrawer state={drawerState} />
    </div>
  );
}
