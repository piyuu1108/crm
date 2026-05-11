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
  Tooltip,
  type Selection,
} from "@heroui/react";
import { Plus, Magnifier, Funnel, ChevronUp, FileArrowUp, Gear, ChevronDown, ArrowDownToLine } from "@gravity-ui/icons";
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
import { EditFacultyModal } from "./edit-faculty-modal";
import type { SortDescriptor } from "@heroui/react";

const STATUS_COLOR: Record<string, "success" | "danger"> = {
  true: "success",
  false: "danger",
};

const COLUMNS = [
  { name: "Code", uid: "facultyCode" },
  { name: "Member", uid: "name" },
  { name: "Email", uid: "email" },
  { name: "Mobile", uid: "mobile" },
  { name: "Designation", uid: "designation" },
  { name: "Status", uid: "isActive" },
  { name: "Assignments", uid: "assignments" },
  { name: "Actions", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["facultyCode", "name", "email", "mobile", "designation", "isActive", "assignments", "actions"];

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
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();
  const debouncedSearch = useDebounce(searchInput, 300);

  const [emailJobId, setEmailJobId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("faculty-email-job:admin");
  });

  const singleEmailMutation = useFacultyPasswordEmailMutation();
  const { data: emailJobProgress } = useFacultyEmailJobProgressQuery(emailJobId);

  useEffect(() => {
    if (!emailJobId) return;
    localStorage.setItem("faculty-email-job:admin", emailJobId);
  }, [emailJobId]);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(INITIAL_VISIBLE_COLUMNS));
  const rowsPerPage = 10;

  useEffect(() => {
    const saved = localStorage.getItem("faculty_table_columns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVisibleColumns(new Set(parsed));
        }
      } catch (e) {}
    }
  }, []);

  const handleColumnSelectionChange = (keys: any) => {
    if (keys === "all") {
      const allKeys = COLUMNS.map(c => c.uid);
      setVisibleColumns(new Set(allKeys));
      localStorage.setItem("faculty_table_columns", JSON.stringify(allKeys));
      return;
    }
    const newKeys = Array.from(keys) as string[];
    setVisibleColumns(new Set(newKeys));
    localStorage.setItem("faculty_table_columns", JSON.stringify(newKeys));
  };

  const params: FacultyListParams = useMemo(
    () => ({
      page: 1,
      limit: 1000,
    }),
    []
  );

  const { data, isLoading, isError, error, refetch } =
    useFacultyListQuery(params);

  const filteredItems = useMemo(() => {
    let filtered = [...(data?.faculty || [])];

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((f) =>
        f.name.toLowerCase().includes(q) ||
        f.facultyCode.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => {
      let first = a[sortDescriptor.column as keyof typeof a];
      let second = b[sortDescriptor.column as keyof typeof b];
      let cmp = (first || "") < (second || "") ? -1 : (first || "") > (second || "") ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [data?.faculty, debouncedSearch, sortDescriptor]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const end = Math.min(page * rowsPerPage, totalItems);

  const items = useMemo(() => {
    return filteredItems.slice(start, end);
  }, [page, filteredItems, start, end]);

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
        </div>

        <div className="flex items-center gap-3">

            <Dropdown>
              <Button variant="outline" size="sm">
                Columns <Gear className="size-4 ml-1" />
                <ChevronDown className="size-4 ml-1" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Table Columns"
                  selectedKeys={visibleColumns}
                  selectionMode="multiple"
                  onSelectionChange={handleColumnSelectionChange}
                >
                  {COLUMNS.map((column) => (
                    <Dropdown.Item id={column.uid} key={column.uid} textValue={column.name} className="capitalize">
                      <Dropdown.ItemIndicator />
                      <Label>{column.name}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            
            <Button variant="outline" size="sm">
              <ArrowDownToLine className="size-4 mr-1" />
              Export
            </Button>
          </div>
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
              {debouncedSearch
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
            >
              <Table.Header>
                {visibleColumns.has("facultyCode") && (
                  <Table.Column allowsSorting isRowHeader id="facultyCode" className="w-[120px]">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Code</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("name") && (
                  <Table.Column allowsSorting id="name">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Member</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("email") && <Table.Column className="min-w-[180px]">Email</Table.Column>}
                {visibleColumns.has("mobile") && <Table.Column className="w-[140px]">Mobile</Table.Column>}
                {visibleColumns.has("designation") && <Table.Column className="min-w-[160px]">Designation</Table.Column>}
                {visibleColumns.has("isActive") && <Table.Column className="w-[100px]">Status</Table.Column>}
                {visibleColumns.has("assignments") && <Table.Column>Assignments</Table.Column>}
                {visibleColumns.has("actions") && <Table.Column className="w-[56px]">Actions</Table.Column>}
              </Table.Header>

              <Table.Body>
                {items.map((f) => (
                  <Table.Row key={f.id} id={f.id}>
                    {visibleColumns.has("facultyCode") && (
                      <Table.Cell>
                        <span className=" text-sm font-bold">{f.facultyCode}</span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("name") && (
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">{f.name}</span>
                          </div>
                        </div>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("email") && (
                      <Table.Cell>
                        <span className="text-sm text-muted-foreground">{f.email}</span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("mobile") && (
                      <Table.Cell>
                        <span className="text-sm text-foreground/80">{f.mobile}</span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("designation") && (
                      <Table.Cell>
                        <span className="text-sm text-foreground/80">{f.designation || "—"}</span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("isActive") && (
                      <Table.Cell>
                        <Chip color={STATUS_COLOR[String(f.isActive)]} size="sm" variant="soft">
                          {f.isActive ? "Active" : "Inactive"}
                        </Chip>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("assignments") && (
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {f.assignments && f.assignments.length > 0 ? (
                            f.assignments.map((a, i) => (
                              <Tooltip key={i}>
                                <Tooltip.Trigger>
                                  <Chip size="sm" variant="soft" className="cursor-default">
                                    {a.subjectShortCode}/{a.divisionName}
                                  </Chip>
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                  <div className="flex flex-col gap-1 px-1 py-1">
                                    <div className="font-semibold text-small">{a.subjectName}</div>
                                    <div className="text-tiny text-default-500">
                                      {a.subjectCode} • {a.subjectType} • {a.subjectCredit} Credits
                                    </div>
                                    <div className="text-tiny text-default-500 mt-1">
                                      Assigned to: {a.divisionName}
                                    </div>
                                  </div>
                                </Tooltip.Content>
                              </Tooltip>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("actions") && (
                      <Table.Cell>
                        <FacultyActionsMenu
                          ariaLabel={`Actions for ${f.name}`}
                          actions={[
                            {
                              id: `edit-${f.id}`,
                              label: "Edit",
                              onAction: () => {
                                setEditingFaculty(f);
                                setIsEditModalOpen(true);
                              },
                            },
                            {
                              id: `send-password-${f.id}`,
                              label: "Send Password Email",
                              isDisabled: singleEmailMutation.isPending,
                              onAction: () => handleSingleSend(f.id, f.name),
                            },
                          ]}
                        />
                      </Table.Cell>
                    )}
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
                  {start + 1} to {end} of {totalItems} results
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

      {/* ── Edit Faculty Modal ────────────────────────────────── */}
      <EditFacultyModal 
        faculty={editingFaculty} 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingFaculty(null);
        }} 
      />
    </div>
  );
}
