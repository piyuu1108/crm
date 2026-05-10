"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Chip,
  Dropdown,
  Label,
  Pagination,
  Spinner,
  Table,
  useOverlayState,
} from "@heroui/react";
import { Plus, Funnel, ChevronUp } from "@gravity-ui/icons";
import {
  useSubjectAssignmentsQuery,
  subjectAssignmentsKeys,
  type SubjectAssignmentsParams,
} from "@/app/lib/queries/subject-assignments";
import { AssignSubjectDrawer } from "./assign-subject-drawer";
import { sortDivisions } from "@/app/lib/utils/sort-utils";

// ─── Subject type badge colors ────────────────────────────────────────────────
const TYPE_COLOR: Record<string, "accent" | "success" | "warning"> = {
  theory: "accent",
  practical: "success",
  both: "warning",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-divider bg-default/10 animate-pulse"
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SubjectAssignmentsPage() {
  const [page, setPage] = useState(1);
  const [divisionFilter, setDivisionFilter] = useState("");

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();

  const params: SubjectAssignmentsParams = useMemo(
    () => ({
      page,
      limit: 20,
      divisionId: divisionFilter || undefined,
    }),
    [page, divisionFilter]
  );

  const { data, isLoading, isError, error, refetch } =
    useSubjectAssignmentsQuery(params);

  const handleRecover = useCallback(() => {
    queryClient.removeQueries({
      queryKey: subjectAssignmentsKeys.list(params),
    });
    void refetch();
    router.refresh();
  }, [params, queryClient, refetch, router]);

  const totalPages = data?.pagination.totalPages ?? 1;
  const total = data?.pagination.total ?? 0;
  const start = data ? (page - 1) * data.pagination.limit + 1 : 0;
  const end = data
    ? Math.min(page * data.pagination.limit, total)
    : 0;

  // Determine division display name for the active filter
  const filterDivisionName = useMemo(() => {
    if (!divisionFilter || !data?.allDivisions) return null;
    const div = data.allDivisions.find(
      (d) => String(d.id) === divisionFilter
    );
    return div?.displayName ?? null;
  }, [divisionFilter, data?.allDivisions]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Subject Assignments
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage faculty–subject–division assignments
          </p>
        </div>
        <Button onPress={drawerState.open}>
          <Plus className="size-4" />
          Assign Subject
        </Button>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {/* Division filter dropdown */}
          <Dropdown>
            <Button variant="secondary" size="sm">
              <Funnel className="size-4" />
              {filterDivisionName ? filterDivisionName : "All Divisions"}
            </Button>
            <Dropdown.Popover className="min-w-[200px] max-h-[300px] overflow-y-auto">
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={new Set([divisionFilter])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setPage(1);
                  setDivisionFilter(selected ?? "");
                }}
              >
                <Dropdown.Item id="" textValue="All Divisions">
                  <Dropdown.ItemIndicator />
                  <Label>All Divisions</Label>
                </Dropdown.Item>
                {sortDivisions(data?.allDivisions ?? [], (d) => d.displayName).map((div) => (
                  <Dropdown.Item
                    key={div.id}
                    id={String(div.id)}
                    textValue={div.displayName}
                  >
                    <Dropdown.ItemIndicator />
                    <Label>
                      <span className="font-mono text-xs">{div.displayName}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({div.specialization})
                      </span>
                    </Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* Result count */}
        {data && (
          <span className="text-xs text-muted-foreground">
            {total} assignment{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load assignments
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
      ) : data && data.assignments.length === 0 ? (
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-4xl">📚</div>
            <p className="text-sm text-muted-foreground">
              {divisionFilter
                ? "No subject assignments match this filter"
                : 'No subject assignments yet — click "Assign Subject" to get started'}
            </p>
          </Card.Content>
        </Card>
      ) : data ? (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Subject assignments table"
              className="min-w-[600px]"
            >
              <Table.Header>
                <Table.Column isRowHeader id="division" className="min-w-[160px]">
                  Division
                </Table.Column>
                <Table.Column id="subject" className="min-w-[200px]">
                  Subject
                </Table.Column>
                <Table.Column id="faculty" className="min-w-[180px]">
                  Faculty
                </Table.Column>
              </Table.Header>

              <Table.Body>
                {data.assignments.map((row) => (
                  <Table.Row key={row.id} id={row.id}>
                    <Table.Cell>
                      <span className="font-mono text-sm font-medium text-accent">
                        {row.divisionName}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {row.subjectName}
                        </span>
                        <Chip
                          color={TYPE_COLOR[row.subjectType] || "accent"}
                          size="sm"
                          variant="soft"
                        >
                          {row.subjectType}
                        </Chip>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-foreground/80">
                        {row.facultyName}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>

          {/* ── Pagination Footer ────────────────────────────── */}
          {totalPages > 1 && (
            <Table.Footer>
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
            </Table.Footer>
          )}
        </Table>
      ) : null}

      {/* ── Assign Subject Drawer ──────────────────────────────── */}
      <AssignSubjectDrawer state={drawerState} />
    </div>
  );
}
