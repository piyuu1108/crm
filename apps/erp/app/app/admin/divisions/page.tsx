"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Chip,
  Pagination,
  Table,
  Tooltip,
  useOverlayState,
} from "@heroui/react";
import { Plus, ChevronRight } from "@gravity-ui/icons";
import {
  divisionListKey,
  useDivisionListQuery,
  type DivisionListParams,
} from "@/app/lib/queries/divisions";
import { CreateDivisionDrawer } from "./create-division-drawer";

// ─── Specialization badge colors ──────────────────────────────────────────────
const SPEC_COLOR: Record<string, "accent" | "success" | "warning"> = {
  AI: "accent",
  DS: "success",
  REGULAR: "warning",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function DivisionTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl border border-divider bg-default/10 animate-pulse"
        />
      ))}
    </div>
  );
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
        <DivisionTableSkeleton />
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
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {total} division{total !== 1 ? "s" : ""}
            </span>
          </div>

          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Divisions list" className="min-w-[800px]">
                <Table.Header>
                  <Table.Column isRowHeader>Division Name</Table.Column>
                  <Table.Column className="text-center">Semester</Table.Column>
                  <Table.Column>Specialization</Table.Column>
                  <Table.Column className="text-center">Batch</Table.Column>
                  <Table.Column className="text-center">Students</Table.Column>
                  <Table.Column>Counselor</Table.Column>
                  <Table.Column>Assignments</Table.Column>
                  <Table.Column className="text-end w-16">Actions</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No divisions found.</div>
                  )}
                >
                  {[...data.divisions].sort((a, b) => {
                    if (a.semesterNo !== b.semesterNo) return a.semesterNo - b.semesterNo;
                    return a.divisionNo - b.divisionNo;
                  }).map((div) => (
                    <Table.Row key={div.id} id={div.id}>
                      <Table.Cell className="font-mono font-semibold">{div.displayName}</Table.Cell>
                      <Table.Cell className="text-center text-muted-foreground">{div.semesterNo}</Table.Cell>
                      <Table.Cell>
                        <Chip
                          color={SPEC_COLOR[div.specialization] || "accent"}
                          size="sm"
                          variant="soft"
                        >
                          {div.specialization}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-center font-mono">{div.batchYear}</Table.Cell>
                      <Table.Cell className="text-center">{div.studentCount}</Table.Cell>
                      <Table.Cell>
                        {div.counselorName || (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {div.assignments && div.assignments.length > 0 ? (
                            div.assignments.map((a, i) => (
                              <Tooltip key={i}>
                                <Tooltip.Trigger>
                                  <Chip className="text-xs cursor-default" size="sm" variant="soft">
                                    {a.subjectShortCode}/{a.facultyCode}
                                  </Chip>
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                  <div className="px-1 py-1.5 flex flex-col gap-0.5">
                                    <p className="text-xs font-semibold">Subject: <span className="font-normal">{a.subjectName}</span></p>
                                    <p className="text-xs font-semibold">Code: <span className="font-normal">{a.subjectCode}</span></p>
                                    <p className="text-xs font-semibold">Type: <span className="font-normal capitalize">{a.subjectType}</span></p>
                                    <p className="text-xs font-semibold">Credits: <span className="font-normal">{a.subjectCredit}</span></p>
                                    <p className="text-xs font-semibold mt-1 pt-1 border-t border-divider">Faculty: <span className="font-normal">{a.facultyName}</span></p>
                                  </div>
                                </Tooltip.Content>
                              </Tooltip>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-end">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => router.push(`/app/admin/divisions/${div.id}`)}
                          aria-label="View division"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

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
