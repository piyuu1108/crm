"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
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
  Input,
  Dropdown,
  Label,
} from "@heroui/react";
import { Plus, ChevronRight, Magnifier, Gear, ArrowDownToLine, ChevronDown } from "@gravity-ui/icons";
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

const INITIAL_VISIBLE_COLUMNS = ["displayName", "semesterNo", "specialization", "batchYear", "studentCount", "counselorName", "assignments", "actions"];

const COLUMNS = [
  { uid: "displayName", name: "Division Name" },
  { uid: "semesterNo", name: "Semester" },
  { uid: "specialization", name: "Specialization" },
  { uid: "batchYear", name: "Batch" },
  { uid: "studentCount", name: "Students" },
  { uid: "counselorName", name: "Counselor" },
  { uid: "assignments", name: "Assignments" },
  { uid: "actions", name: "Actions" },
];

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
  const rowsPerPage = 12;
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(INITIAL_VISIBLE_COLUMNS));

  useEffect(() => {
    const saved = localStorage.getItem("divisions_table_columns");
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
      localStorage.setItem("divisions_table_columns", JSON.stringify(allKeys));
      return;
    }
    const newKeys = Array.from(keys) as string[];
    setVisibleColumns(new Set(newKeys));
    localStorage.setItem("divisions_table_columns", JSON.stringify(newKeys));
  };

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();

  const params: DivisionListParams = { page: 1, limit: 1000 };
  const { data, isLoading, isError, error, refetch } =
    useDivisionListQuery(params);

  const handleRecover = useCallback(() => {
    queryClient.removeQueries({ queryKey: divisionListKey(params) });
    void refetch();
  }, [params, queryClient, refetch]);

  const filteredItems = useMemo(() => {
    let filteredDivisions = [...(data?.divisions || [])];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredDivisions = filteredDivisions.filter((div) =>
        div.displayName.toLowerCase().includes(q) ||
        div.specialization.toLowerCase().includes(q)
      );
    }

    return filteredDivisions.sort((a, b) => {
      if (a.semesterNo !== b.semesterNo) return a.semesterNo - b.semesterNo;
      return a.divisionNo - b.divisionNo;
    });
  }, [data?.divisions, searchQuery]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const end = Math.min(page * rowsPerPage, totalItems);
  
  const items = useMemo(() => {
    return filteredItems.slice(start, end);
  }, [page, filteredItems, start, end]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Divisions
          </h1>
          {/* <p className="text-sm text-muted-foreground">
            Manage academic divisions, upload students, and view details
          </p> */}
        </div>
        <Button onPress={drawerState.open}>
          <Plus className="size-4" />
          Create Division
        </Button>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
        <Input
          className="w-full sm:max-w-[300px]"
          placeholder="Search by name or spec..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-3">
          <Dropdown>
            <Button variant="outline">
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
          <Button variant="outline">
            <ArrowDownToLine className="size-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

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
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {totalItems} division{totalItems !== 1 ? "s" : ""}
            </span>
          </div>

          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Divisions list" className="min-w-[800px]">
                <Table.Header>
                  {visibleColumns.has("displayName") && <Table.Column isRowHeader>Division Name</Table.Column>}
                  {visibleColumns.has("semesterNo") && <Table.Column className="text-center">Semester</Table.Column>}
                  {visibleColumns.has("specialization") && <Table.Column>Specialization</Table.Column>}
                  {visibleColumns.has("batchYear") && <Table.Column className="text-center">Batch</Table.Column>}
                  {visibleColumns.has("studentCount") && <Table.Column className="text-center">Students</Table.Column>}
                  {visibleColumns.has("counselorName") && <Table.Column>Counselor</Table.Column>}
                  {visibleColumns.has("assignments") && <Table.Column>Assignments</Table.Column>}
                  {visibleColumns.has("actions") && <Table.Column className="text-end w-16">Actions</Table.Column>}
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No divisions found.</div>
                  )}
                >
                  {items.map((div) => (
                    <Table.Row key={div.id} id={div.id}>
                      {visibleColumns.has("displayName") && <Table.Cell className="font-mono font-semibold">{div.displayName}</Table.Cell>}
                      {visibleColumns.has("semesterNo") && <Table.Cell className="text-center text-muted-foreground">{div.semesterNo}</Table.Cell>}
                      {visibleColumns.has("specialization") && (
                        <Table.Cell>
                          <Chip
                            color={SPEC_COLOR[div.specialization] || "accent"}
                            size="sm"
                            variant="soft"
                          >
                            {div.specialization}
                          </Chip>
                        </Table.Cell>
                      )}
                      {visibleColumns.has("batchYear") && <Table.Cell className="text-center font-mono">{div.batchYear}</Table.Cell>}
                      {visibleColumns.has("studentCount") && <Table.Cell className="text-center">{div.studentCount}</Table.Cell>}
                      {visibleColumns.has("counselorName") && (
                        <Table.Cell>
                          {div.counselorName || (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </Table.Cell>
                      )}
                      {visibleColumns.has("assignments") && (
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
                      )}
                      {visibleColumns.has("actions") && (
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
                      )}
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
            </div>
          )}
        </>
      ) : null}

      {/* ── Create Division Drawer ─────────────────────────────── */}
      <CreateDivisionDrawer state={drawerState} />
    </div>
  );
}
