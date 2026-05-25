"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  Tooltip,
  useOverlayState,
} from "@heroui/react";
import { Plus, ChevronRight, ArrowDownToLine } from "@gravity-ui/icons";
import {
  useDivisionListQuery,
  type DivisionListParams,
} from "@/app/lib/queries/divisions";
import { CreateDivisionDrawer } from "./create-division-drawer";
import { DataTable, type TableColumnDef } from "@/components/data-table";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

// ─── Specialization badge colors ──────────────────────────────────────────────
const SPEC_COLOR: Record<string, "accent" | "success" | "warning"> = {
  AI: "accent",
  DS: "success",
  REGULAR: "warning",
};

const INITIAL_VISIBLE_COLUMNS = ["displayName", "semesterNo", "specialization", "batchYear", "studentCount", "counselorName", "assignments", "actions"];

const COLUMNS: TableColumnDef[] = [
  { uid: "displayName", name: "Division Name", isRowHeader: true },
  { uid: "semesterNo", name: "Semester", className: "text-center" },
  { uid: "specialization", name: "Specialization" },
  { uid: "batchYear", name: "Batch", className: "text-center" },
  { uid: "studentCount", name: "Students", className: "text-center" },
  { uid: "counselorName", name: "Counselor" },
  { uid: "assignments", name: "Assignments" },
  { uid: "actions", name: "Actions", className: "text-end w-16" },
];

export default function DivisionsPage() {
  const drawerState = useOverlayState();
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const isAdmin = activeRole === "principal" || activeRole === "vice_principal";

  const params: DivisionListParams = { page: 1, limit: 1000 };
  const { data, isLoading, isError, error, refetch } =
    useDivisionListQuery(params);

  const renderCell = useCallback((div: any, columnKey: string) => {
    switch (columnKey) {
      case "displayName":
        return <span className="font-mono font-semibold">{div.displayName}</span>;
      case "semesterNo":
        return <span className="text-center block text-muted-foreground">{div.semesterNo}</span>;
      case "specialization":
        return (
          <Chip
            color={SPEC_COLOR[div.specialization] || "accent"}
            size="sm"
            variant="soft"
          >
            {div.specialization}
          </Chip>
        );
      case "batchYear":
        return <span className="text-center block font-mono">{div.batchYear}</span>;
      case "studentCount":
        return <span className="text-center block">{div.studentCount}</span>;
      case "counselorName":
        return (
          <span>
            {div.counselorName || (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </span>
        );
      case "assignments":
        return (
          <div className="flex flex-wrap gap-1">
            {div.assignments && div.assignments.length > 0 ? (
              div.assignments.map((a: any, i: number) => (
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
        );
      case "actions":
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={() => router.push(`/app/admin/divisions/${div.id}`)}
              aria-label="View division"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  }, [router]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Divisions
          </h1>
        </div>
        {!isAdmin && (
          <Button onPress={drawerState.open}>
            <Plus className="size-4" />
            Create Division
          </Button>
        )}
      </div>

      <DataTable
        data={data?.divisions || []}
        columns={COLUMNS}
        initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
        searchKeys={["displayName", "specialization"]}
        searchPlaceholder="Search by name or spec..."
        renderCell={renderCell}
        localStorageKey="divisions_table_columns"
        isLoading={isLoading}
        isError={isError}
        error={error}
        refetch={refetch}
        emptyStateMessage="No divisions found."
        toolbarActions={
          <Button variant="tertiary" size="sm">
            <ArrowDownToLine className="size-4 mr-1" />
            Export
          </Button>
        }
      />

      {/* ── Create Division Drawer ─────────────────────────────── */}
      {!isAdmin && <CreateDivisionDrawer state={drawerState} />}
    </div>
  );
}
