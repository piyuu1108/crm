"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Chip,
  Dropdown,
  Input,
  Label,
  Modal,
  Pagination,
  Spinner,
  Table,
  Tooltip,
  useOverlayState,
  toast,
  type Selection,
} from "@heroui/react";
import {
  Plus,
  Magnifier,
  Gear,
  ChevronDown,
  ChevronUp,
  ArrowDownToLine,
  TrashBin,
} from "@gravity-ui/icons";
import {
  adminSubjectsListKey,
  useAdminSubjectsListQuery,
  useDeleteSubjectMutation,
  type SubjectAdminListItem,
} from "@/app/lib/queries/subjects";
import { AddSubjectDrawer } from "./add-subject-drawer";
import { EditSubjectModal } from "./edit-subject-modal";
import { SubjectActionsMenu } from "./subject-actions-menu";
import type { SortDescriptor } from "@heroui/react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, "accent" | "success" | "warning" | "danger" | "default"> = {
  theory: "accent",
  practical: "success",
  both: "warning",
  project_minor: "default",
  project_major: "danger",
};

const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  practical: "Practical",
  both: "Both",
  project_minor: "Project Minor",
  project_major: "Project Major",
};

const COLUMNS = [
  { name: "Code", uid: "code" },
  { name: "Short Name", uid: "shortCode" },
  { name: "Name", uid: "name" },
  { name: "Semester", uid: "semester" },
  { name: "Credit", uid: "credit" },
  { name: "Type", uid: "subjectType" },
  { name: "Assignments", uid: "assignments" },
  { name: "Actions", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = [
  "code",
  "shortCode",
  "name",
  "semester",
  "credit",
  "subjectType",
  "assignments",
  "actions",
];

// ─── Debounce ─────────────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SubjectsTableSkeleton() {
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

// ─── Export helper ────────────────────────────────────────────────────────────

function exportSubjectsCSV(subjects: SubjectAdminListItem[]) {
  const headers = [
    "Code",
    "Short Code",
    "Name",
    "Semester",
    "Credit",
    "Type",
    "Int.Theory",
    "Ext.Theory",
    "Theory Pass",
    "Int.Practical",
    "Ext.Practical",
    "Practical Pass",
    "Assignments",
  ];
  const rows = subjects.map((s) => [
    s.code,
    s.shortCode ?? "",
    s.name,
    s.semester ?? "",
    s.credit ?? "",
    s.subjectType,
    s.internalTheoryMax ?? "",
    s.externalTheoryMax ?? "",
    s.theoryPassingMarks ?? "",
    s.internalPracticalMax ?? "",
    s.externalPracticalMax ?? "",
    s.practicalPassingMarks ?? "",
    s.assignments.map((a) => `${a.divisionName}(${a.facultyName})`).join("; "),
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `subjects_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  subject,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  subject: SubjectAdminListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Modal.Container placement="center">
          <Modal.Dialog className="w-full max-w-sm">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-danger">Remove Subject</h2>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-foreground">
                Are you sure you want to remove{" "}
                <strong>
                  {subject?.name} ({subject?.code})
                </strong>
                ?
              </p>
              {subject && subject.assignments.length > 0 && (
                <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
                  <p className="text-xs font-semibold text-danger mb-1">
                    ⚠ Cannot delete — active assignments exist
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This subject is used in {subject.assignments.length} assignment(s). Remove all
                    faculty-subject assignments first, then try again.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {subject.assignments.slice(0, 5).map((a, i) => (
                      <li key={i} className="text-xs text-foreground/70">
                        • {a.divisionName} — {a.facultyName}
                      </li>
                    ))}
                    {subject.assignments.length > 5 && (
                      <li className="text-xs text-muted-foreground">
                        + {subject.assignments.length - 5} more…
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-danger text-white"
                onPress={onConfirm}
                isPending={isLoading}
                isDisabled={isLoading || (subject?.assignments?.length ?? 0) > 0}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Removing…" : "Remove Subject"}
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubjectsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "code",
    direction: "ascending",
  });

  const [editingSubject, setEditingSubject] = useState<SubjectAdminListItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [deletingSubject, setDeletingSubject] = useState<SubjectAdminListItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(INITIAL_VISIBLE_COLUMNS)
  );

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();
  const debouncedSearch = useDebounce(searchInput, 300);
  const deleteMutation = useDeleteSubjectMutation();

  React.useEffect(() => {
    const saved = localStorage.getItem("subjects_table_columns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setVisibleColumns(new Set(parsed));
      } catch {}
    }
  }, []);

  const handleColumnSelectionChange = (keys: any) => {
    if (keys === "all") {
      const allKeys = COLUMNS.map((c) => c.uid);
      setVisibleColumns(new Set(allKeys));
      localStorage.setItem("subjects_table_columns", JSON.stringify(allKeys));
      return;
    }
    const newKeys = Array.from(keys) as string[];
    setVisibleColumns(new Set(newKeys));
    localStorage.setItem("subjects_table_columns", JSON.stringify(newKeys));
  };

  const rowsPerPage = 10;

  const { data, isLoading, isError, error, refetch } = useAdminSubjectsListQuery();

  const filteredItems = useMemo(() => {
    let filtered = [...(data ?? [])];

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.shortCode ?? "").toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => {
      const col = sortDescriptor.column as keyof SubjectAdminListItem;
      const first = a[col];
      const second = b[col];
      const cmp =
        (first ?? "") < (second ?? "") ? -1 : (first ?? "") > (second ?? "") ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [data, debouncedSearch, sortDescriptor]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const end = Math.min(page * rowsPerPage, totalItems);

  const items = useMemo(() => filteredItems.slice(start, end), [filteredItems, start, end]);

  const handleRecover = useCallback(() => {
    queryClient.removeQueries({ queryKey: adminSubjectsListKey });
    void refetch();
    router.refresh();
  }, [queryClient, refetch, router]);

  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingSubject) return;
    try {
      await deleteMutation.mutateAsync(deletingSubject.id);
      toast.success("Subject removed", {
        description: `"${deletingSubject.name}" has been deleted.`,
      });
      setIsDeleteModalOpen(false);
      setDeletingSubject(null);
    } catch (err) {
      toast.danger("Failed to remove subject", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subject Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage subjects, marking schemes, and assignments
          </p>
        </div>
        <Button onPress={drawerState.open}>
          <Plus className="size-4" />
          Add Subject
        </Button>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Input
              placeholder="Search by code or name…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              className="pl-9 w-full"
              aria-label="Search subjects"
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
                  <Dropdown.Item
                    id={column.uid}
                    key={column.uid}
                    textValue={column.name}
                    className="capitalize"
                  >
                    <Dropdown.ItemIndicator />
                    <Label>{column.name}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          <Button
            variant="outline"
            size="sm"
            onPress={() => data && exportSubjectsCSV(filteredItems)}
            isDisabled={!data || filteredItems.length === 0}
          >
            <ArrowDownToLine className="size-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <SubjectsTableSkeleton />
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Failed to load subjects</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
            </div>
            <Button variant="secondary" onPress={handleRecover}>
              Try Again
            </Button>
          </Card.Content>
        </Card>
      ) : data && data.length === 0 ? (
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-4xl">📚</div>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "No subjects match your search"
                : 'No subjects yet — click "Add Subject" to get started'}
            </p>
          </Card.Content>
        </Card>
      ) : data ? (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Subjects table"
              className="min-w-[800px]"
              sortDescriptor={sortDescriptor}
              onSortChange={handleSortChange}
            >
              <Table.Header>
                {visibleColumns.has("code") && (
                  <Table.Column allowsSorting isRowHeader id="code" className="w-[110px]">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Code</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("shortCode") && (
                  <Table.Column id="shortCode" className="w-[100px]">
                    Short Name
                  </Table.Column>
                )}
                {visibleColumns.has("name") && (
                  <Table.Column allowsSorting id="name">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Name</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("semester") && (
                  <Table.Column allowsSorting id="semester" className="w-[100px]">
                    {({ sortDirection }) => (
                      <SortableColumnHeader sortDirection={sortDirection}>Semester</SortableColumnHeader>
                    )}
                  </Table.Column>
                )}
                {visibleColumns.has("credit") && (
                  <Table.Column id="credit" className="w-[80px]">
                    Credit
                  </Table.Column>
                )}
                {visibleColumns.has("subjectType") && (
                  <Table.Column id="subjectType" className="w-[110px]">
                    Type
                  </Table.Column>
                )}
                {visibleColumns.has("assignments") && (
                  <Table.Column id="assignments">Assignments</Table.Column>
                )}
                {visibleColumns.has("actions") && (
                  <Table.Column id="actions" className="w-[56px]">
                    Actions
                  </Table.Column>
                )}
              </Table.Header>

              <Table.Body>
                {items.map((s) => (
                  <Table.Row key={s.id} id={s.id}>
                    {visibleColumns.has("code") && (
                      <Table.Cell>
                        <span className="text-sm font-bold font-mono">{s.code}</span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("shortCode") && (
                      <Table.Cell>
                        <span className="text-sm text-muted-foreground">
                          {s.shortCode || "—"}
                        </span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("name") && (
                      <Table.Cell>
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("semester") && (
                      <Table.Cell>
                        <span className="text-sm text-foreground/80">
                          {s.semester != null ? `Sem ${s.semester}` : "—"}
                        </span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("credit") && (
                      <Table.Cell>
                        <span className="text-sm text-foreground/80">
                          {s.credit != null ? s.credit : "—"}
                        </span>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("subjectType") && (
                      <Table.Cell>
                        <Chip
                          color={TYPE_COLOR[s.subjectType] ?? "default"}
                          size="sm"
                          variant="soft"
                        >
                          {TYPE_LABELS[s.subjectType] ?? s.subjectType}
                        </Chip>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("assignments") && (
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {s.assignments && s.assignments.length > 0 ? (
                            s.assignments.map((a, i) => (
                              <Tooltip key={i}>
                                <Tooltip.Trigger>
                                  <Chip size="sm" variant="soft" className="cursor-default">
                                    {a.divisionName}
                                  </Chip>
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                  <div className="flex flex-col gap-1 px-1 py-1">
                                    <div className="font-semibold text-small">{a.divisionName}</div>
                                    <div className="text-tiny text-default-500">
                                      Faculty: {a.facultyName}
                                    </div>
                                  </div>
                                </Tooltip.Content>
                              </Tooltip>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </Table.Cell>
                    )}
                    {visibleColumns.has("actions") && (
                      <Table.Cell>
                        <SubjectActionsMenu
                          ariaLabel={`Actions for ${s.name}`}
                          actions={[
                            {
                              id: `edit-${s.id}`,
                              label: "Edit",
                              onAction: () => {
                                setEditingSubject(s);
                                setIsEditModalOpen(true);
                              },
                            },
                            {
                              id: `remove-${s.id}`,
                              label: "Remove",
                              isDanger: true,
                              onAction: () => {
                                setDeletingSubject(s);
                                setIsDeleteModalOpen(true);
                              },
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

          {/* ── Pagination ─────────────────────────────────────────── */}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p}>
                      <Pagination.Link isActive={page === p} onPress={() => setPage(p)}>
                        {p}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={page === totalPages}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* ── Add Subject Drawer ───────────────────────────────────────── */}
      <AddSubjectDrawer state={drawerState} />

      {/* ── Edit Subject Modal ───────────────────────────────────────── */}
      <EditSubjectModal
        subject={editingSubject}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSubject(null);
        }}
      />

      {/* ── Delete Confirm Modal ─────────────────────────────────────── */}
      <DeleteConfirmModal
        subject={deletingSubject}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingSubject(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
