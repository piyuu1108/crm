"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Dropdown,
  Label,
  useOverlayState,
  Spinner,
} from "@heroui/react";
import { Plus, Funnel } from "@gravity-ui/icons";
import {
  useSubjectAssignmentsQuery,
  subjectAssignmentsKeys,
  type SubjectAssignmentsParams,
} from "@/app/lib/queries/subject-assignments";
import { AssignSubjectDrawer } from "./assign-subject-drawer";
import { sortDivisions } from "@/app/lib/utils/sort-utils";
import { DataTable, type TableColumnDef } from "@/components/data-table";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

// ─── Subject type badge colors ────────────────────────────────────────────────
const TYPE_COLOR: Record<string, "accent" | "success" | "warning"> = {
  theory: "accent",
  practical: "success",
  both: "warning",
};

const COLUMNS: TableColumnDef[] = [
  { uid: "divisionName", name: "Division", allowsSorting: true, isRowHeader: true, className: "min-w-[160px]" },
  { uid: "subjectName", name: "Subject", allowsSorting: true, className: "min-w-[200px]" },
  { uid: "facultyName", name: "Faculty", allowsSorting: true, className: "min-w-[180px]" },
];

const INITIAL_VISIBLE_COLUMNS = ["divisionName", "subjectName", "facultyName"];

export default function SubjectAssignmentsPage() {
  const { activeRole } = useAuthStore();
  const isAdmin = activeRole === "principal" || activeRole === "vice_principal";

  const [divisionFilter, setDivisionFilter] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) {
      router.replace("/app/dashboard");
    }
  }, [isAdmin, router]);

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();

  const params: SubjectAssignmentsParams = useMemo(
    () => ({
      page: 1,
      limit: 1000,
    }),
    []
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

  // Determine division display name for the active filter
  const filterDivisionName = useMemo(() => {
    if (!divisionFilter || !data?.allDivisions) return null;
    const div = data.allDivisions.find(
      (d) => String(d.id) === divisionFilter
    );
    return div?.displayName ?? null;
  }, [divisionFilter, data?.allDivisions]);

  const filteredAssignments = useMemo(() => {
    let list = data?.assignments || [];
    if (divisionFilter) {
      list = list.filter((a) => String(a.divisionId) === divisionFilter);
    }
    return list;
  }, [data?.assignments, divisionFilter]);

  const renderCell = useCallback((row: any, columnKey: string) => {
    switch (columnKey) {
      case "divisionName":
        return (
          <span className="font-mono text-sm font-medium text-accent">
            {row.divisionName}
          </span>
        );
      case "subjectName":
        return (
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
        );
      case "facultyName":
        return (
          <span className="text-sm text-foreground/80">
            {row.facultyName}
          </span>
        );
      default:
        return null;
    }
  }, []);

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
        {!isAdmin && (
          <Button onPress={drawerState.open}>
            <Plus className="size-4" />
            Assign Subject
          </Button>
        )}
      </div>

      <DataTable
        data={filteredAssignments}
        columns={COLUMNS}
        initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
        searchKeys={["divisionName", "subjectName", "facultyName"]}
        searchPlaceholder="Search assignments..."
        renderCell={renderCell}
        localStorageKey="subject_assignments_table_columns"
        isLoading={isLoading}
        isError={isError}
        error={error}
        refetch={refetch}
        emptyStateMessage="No subject assignments found."
        toolbarActions={
          <Dropdown>
            <Button variant="tertiary" size="sm">
              <Funnel className="size-4" />
              {filterDivisionName ? filterDivisionName : "All Divisions"}
            </Button>
            <Dropdown.Popover className="min-w-[200px] max-h-[300px] overflow-y-auto">
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={new Set([divisionFilter])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
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
        }
      />

      {/* ── Assign Subject Drawer ──────────────────────────────── */}
      <AssignSubjectDrawer state={drawerState} />
    </div>
  );
}
