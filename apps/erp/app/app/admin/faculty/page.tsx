"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Chip,
  Dropdown,
  Input,
  Label,
  Pagination,
  Table,
  Card,
  useOverlayState,
  toast,
  Checkbox,
  type Selection,
} from "@heroui/react";
import { Plus, Magnifier, Funnel, ChevronUp, FileArrowUp } from "@gravity-ui/icons";
import {
  facultyListKey,
  useFacultyListQuery,
  useFacultyPasswordEmailMutation,
  useBulkFacultyPasswordEmailMutation,
  useFacultyEmailJobProgressQuery,
  type FacultyListParams,
} from "@/app/lib/queries/faculty";
import { AddFacultyDrawer } from "./add-faculty-drawer";
import { FacultyActionsMenu } from "./faculty-actions-menu";
import type { SortDescriptor } from "@heroui/react";

// ─── Status badge color map ───────────────────────────────────────────────────
const STATUS_COLOR: Record<string, "success" | "danger"> = {
  true: "success",
  false: "danger",
};

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function FacultyTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-divider bg-default/10 animate-pulse"
        />
      ))}
    </div>
  );
}

// ─── Sortable column header ───────────────────────────────────────────────────
function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: React.ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-between">
      {children}
      {!!sortDirection && (
        <ChevronUp
          className={`size-3 transform transition-transform duration-100 ease-out ${
            sortDirection === "descending" ? "rotate-180" : ""
          }`}
        />
      )}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FacultyPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();
  const debouncedSearch = useDebounce(searchInput, 300);

  const [selectedFacultyIds, setSelectedFacultyIds] = useState<Selection>(new Set());
  const [emailJobId, setEmailJobId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("faculty-email-job:admin");
  });

  const singleEmailMutation = useFacultyPasswordEmailMutation();
  const bulkEmailMutation = useBulkFacultyPasswordEmailMutation();
  const { data: emailJobProgress } = useFacultyEmailJobProgressQuery(emailJobId);

  useEffect(() => {
    if (!emailJobId) return;
    localStorage.setItem("faculty-email-job:admin", emailJobId);
  }, [emailJobId]);

  const params: FacultyListParams = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      sortBy:
        (sortDescriptor.column as FacultyListParams["sortBy"]) ?? "name",
      sortOrder:
        sortDescriptor.direction === "descending" ? "desc" : "asc",
    }),
    [page, debouncedSearch, statusFilter, sortDescriptor]
  );

  const { data, isLoading, isError, error, refetch } =
    useFacultyListQuery(params);

  const handleRecover = useCallback(() => {
    queryClient.removeQueries({ queryKey: facultyListKey(params) });
    void refetch();
    router.refresh();
  }, [params, queryClient, refetch, router]);

  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);
  }, []);

  const handleSingleSend = useCallback(
    async (facultyDbId: number, name: string) => {
      try {
        await singleEmailMutation.mutateAsync(facultyDbId);
        toast.success("Password email sent", {
          description: `${name} has been notified.`,
        });
      } catch (error) {
        toast.danger("Failed to send email", {
          description: error instanceof Error ? error.message : "Please try again",
        });
      }
    },
    [singleEmailMutation]
  );

  const handleBulkSend = useCallback(async () => {
    const faculty = data?.faculty ?? [];
    const selectedCount =
      selectedFacultyIds === "all" ? faculty.length : selectedFacultyIds.size;
    if (selectedCount === 0) return;

    try {
      const ids =
        selectedFacultyIds === "all"
          ? faculty.map((f) => f.id)
          : Array.from(selectedFacultyIds).map((id) => Number(id));

      const payload = await bulkEmailMutation.mutateAsync(ids);
      setEmailJobId(payload.jobId);
      toast.success("Emails are being sent in background");
      setSelectedFacultyIds(new Set());
    } catch (error) {
      toast.danger("Failed to queue bulk send", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  }, [bulkEmailMutation, data?.faculty, selectedFacultyIds]);

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
            Faculty Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage faculty members, assignments, and roles
          </p>
        </div>
        <Button onPress={drawerState.open}>
          <Plus className="size-4" />
          Add Faculty
        </Button>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Input
              placeholder="Search by name, code, or email…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              className="pl-9 w-full"
              aria-label="Search faculty"
            />
            <Magnifier className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>

          {/* Status filter */}
          <Dropdown>
            <Button variant="secondary" size="sm">
              <Funnel className="size-4" />
              {statusFilter
                ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
                : "All Status"}
            </Button>
            <Dropdown.Popover className="min-w-[140px]">
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={new Set([statusFilter])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setPage(1);
                  setStatusFilter(
                    (selected as "" | "active" | "inactive") ?? ""
                  );
                }}
              >
                <Dropdown.Item id="" textValue="All">
                  <Dropdown.ItemIndicator />
                  <Label>All</Label>
                </Dropdown.Item>
                <Dropdown.Item id="active" textValue="Active">
                  <Dropdown.ItemIndicator />
                  <Label>Active</Label>
                </Dropdown.Item>
                <Dropdown.Item id="inactive" textValue="Inactive">
                  <Dropdown.ItemIndicator />
                  <Label>Inactive</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* Result count */}
        {data && (
          <div className="flex items-center gap-4">
            {selectedFacultyIds === "all" || selectedFacultyIds.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-accent">
                  {selectedFacultyIds === "all"
                    ? data.faculty.length
                    : selectedFacultyIds.size}{" "}
                  selected
                </span>
                <FacultyActionsMenu
                  variant="secondary"
                  ariaLabel="Bulk faculty actions"
                  actions={[
                    {
                      id: "send-bulk-email",
                      label: "Send Password Emails",
                      isDisabled: bulkEmailMutation.isPending,
                      onAction: handleBulkSend,
                    },
                  ]}
                />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                {total} faculty member{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Email Job Progress ────────────────────────────────── */}
      {emailJobProgress && emailJobProgress.status !== "completed" && (
        <Card className="border border-accent/20 bg-accent/5">
          <Card.Content className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10">
                <FileArrowUp className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Sending Password Emails…
                </p>
                <p className="text-xs text-muted-foreground">
                  {emailJobProgress.sent} of {emailJobProgress.total} sent •{" "}
                  {emailJobProgress.failed} failed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-accent animate-pulse">
                Processing
              </span>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
      {isLoading ? (
        <FacultyTableSkeleton />
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load faculty
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
      ) : data && data.faculty.length === 0 ? (
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-4xl">👨‍🏫</div>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || statusFilter
                ? "No faculty members match your filters"
                : "No faculty members yet — click \"Add Faculty\" to get started"}
            </p>
          </Card.Content>
        </Card>
      ) : data ? (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Faculty members table"
              className="min-w-[700px]"
              sortDescriptor={sortDescriptor}
              onSortChange={handleSortChange}
              selectionMode="multiple"
              selectedKeys={selectedFacultyIds}
              onSelectionChange={setSelectedFacultyIds}
            >
              <Table.Header>
                <Table.Column className="w-[44px]">
                  <Checkbox aria-label="Select all faculty" slot="selection">
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox>
                </Table.Column>
                <Table.Column
                  allowsSorting
                  isRowHeader
                  id="facultyCode"
                  className="w-[120px]"
                >
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>
                      Code
                    </SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id="name">
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>
                      Member
                    </SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column className="w-[140px]">Mobile</Table.Column>
                <Table.Column className="min-w-[160px]">
                  Designation
                </Table.Column>
                <Table.Column className="w-[100px]">Status</Table.Column>
                <Table.Column className="w-[56px]">Actions</Table.Column>
              </Table.Header>

              <Table.Body>
                {data.faculty.map((f) => (
                  <Table.Row key={f.id} id={f.id}>
                    <Table.Cell>
                      <Checkbox
                        aria-label={`Select ${f.name}`}
                        slot="selection"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs font-medium text-accent">
                        {f.facultyCode}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="sm"
                          className="shrink-0 bg-accent/10 text-accent"
                        >
                          <Avatar.Fallback>
                            {f.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">
                            {f.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {f.email}
                          </span>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-foreground/80">
                        {f.mobile}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-foreground/80">
                        {f.designation || "—"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip
                        color={STATUS_COLOR[String(f.isActive)]}
                        size="sm"
                        variant="soft"
                      >
                        {f.isActive ? "Active" : "Inactive"}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <FacultyActionsMenu
                        ariaLabel={`Actions for ${f.name}`}
                        actions={[
                          {
                            id: `send-password-${f.id}`,
                            label: "Send Password Email",
                            isDisabled: singleEmailMutation.isPending,
                            onAction: () => handleSingleSend(f.id, f.name),
                          },
                        ]}
                      />
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

      {/* ── Add Faculty Drawer ────────────────────────────────── */}
      <AddFacultyDrawer state={drawerState} />
    </div>
  );
}
