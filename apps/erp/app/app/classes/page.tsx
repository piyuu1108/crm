"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Card, Spinner } from "@heroui/react";
import { Eye, Pencil, School, Armchair, LayoutGrid, CheckCircle2, XCircle } from "lucide-react";
import { useClassroomListQuery, type ClassroomListItem } from "@/app/lib/queries/classrooms";
import { DataTable, type TableColumnDef } from "@/components/data-table";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

// ─── KPI Card component ──────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Card className="rounded-2xl border border-divider bg-surface p-5 shadow-sm hover:translate-y-[-2px] transition-all duration-200">
      <Card.Content className="p-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-default-500 uppercase tracking-wider">
            {label}
          </span>
          <div
            className={`flex items-center justify-center size-8 rounded-lg ${
              accent ? "bg-accent/10 text-accent" : "bg-default-100 text-default-500"
            }`}
          >
            <Icon className="size-4" />
          </div>
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
      </Card.Content>
    </Card>
  );
}

// ─── Table columns ───────────────────────────────────────────────────────────
const COLUMNS: TableColumnDef[] = [
  { uid: "roomCode", name: "Room Code", isRowHeader: true, allowsSorting: true },
  { uid: "buildingName", name: "Building", allowsSorting: true },
  { uid: "floor", name: "Floor", allowsSorting: true },
  { uid: "lectureCapacity", name: "Lecture Capacity", className: "text-center", allowsSorting: true },
  { uid: "totalBenches", name: "Total Benches", className: "text-center", allowsSorting: true },
  { uid: "physicalCapacity", name: "Physical Capacity", className: "text-center", allowsSorting: true },
  { uid: "layoutStatus", name: "Layout Status" },
  { uid: "actions", name: "Actions", className: "text-end w-24" },
];

const INITIAL_VISIBLE_COLUMNS = [
  "roomCode",
  "buildingName",
  "floor",
  "lectureCapacity",
  "totalBenches",
  "physicalCapacity",
  "layoutStatus",
  "actions",
];

// ─── Floor badge colors ──────────────────────────────────────────────────────
const FLOOR_COLOR: Record<string, "accent" | "success" | "warning" | "danger"> = {
  Ground: "success",
  First: "accent",
  Second: "warning",
};

export default function ClassesPage() {
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const isHod = activeRole === "hod";

  const { data, isLoading, isError, error, refetch } = useClassroomListQuery();

  const renderCell = useCallback(
    (item: ClassroomListItem, columnKey: string) => {
      switch (columnKey) {
        case "roomCode":
          return (
            <span className="font-mono font-semibold text-foreground">
              {item.roomCode}
            </span>
          );
        case "buildingName":
          return (
            <span className="text-sm text-default-600">
              {item.buildingName || <span className="text-default-400">—</span>}
            </span>
          );
        case "floor":
          return (
            <Chip
              size="sm"
              variant="soft"
              color={FLOOR_COLOR[item.floor] || "accent"}
            >
              {item.floor}
            </Chip>
          );
        case "lectureCapacity":
          return (
            <span className="block text-center font-mono text-default-600">
              {item.lectureCapacity}
            </span>
          );
        case "totalBenches":
          return (
            <span className="block text-center font-mono text-default-600">
              {item.totalBenches}
            </span>
          );
        case "physicalCapacity":
          return (
            <span className="block text-center font-mono text-default-600">
              {item.physicalCapacity}
            </span>
          );
        case "layoutStatus":
          return item.hasLayout ? (
            <Chip size="sm" variant="soft" color="success">
              <CheckCircle2 className="size-3 mr-1" />
              Configured
            </Chip>
          ) : (
            <Chip size="sm" variant="soft" color="danger">
              <XCircle className="size-3 mr-1" />
              Not Configured
            </Chip>
          );
        case "actions":
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onPress={() => router.push(`/app/classes/${item.roomCode}`)}
                aria-label="View classroom"
              >
                <Eye className="size-3.5 mr-1" />
                View
              </Button>
              {isHod && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => router.push(`/app/classes/${item.roomCode}/edit`)}
                  aria-label="Edit layout"
                >
                  <Pencil className="size-3.5 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          );
        default:
          return null;
      }
    },
    [router, isHod]
  );

  const kpi = data?.kpi;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classes</h1>
          <p className="text-sm text-default-500 mt-0.5">
            Manage classroom infrastructure and bench layouts
          </p>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-divider bg-default/10"
            />
          ))}
        </div>
      ) : kpi ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Classes" value={kpi.totalClasses} icon={School} accent />
          <KpiCard label="Physical Capacity" value={kpi.totalPhysicalCapacity} icon={Armchair} />
          <KpiCard label="Active Benches" value={kpi.totalActiveBenches} icon={Armchair} />
          <KpiCard label="Layouts Configured" value={kpi.configuredLayouts} icon={CheckCircle2} />
          <KpiCard label="No Layout" value={kpi.unconfiguredLayouts} icon={XCircle} />
        </div>
      ) : null}

      {/* ── Classroom Table ─────────────────────────────────────── */}
      <DataTable
        data={data?.classrooms || []}
        columns={COLUMNS}
        initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
        searchKeys={["roomCode", "buildingName", "floor"]}
        searchPlaceholder="Search by room code, building, or floor..."
        renderCell={renderCell}
        localStorageKey="classes_table_columns"
        title="All Classrooms"
        isLoading={isLoading}
        isError={isError}
        error={error}
        refetch={refetch}
        emptyStateMessage="No classrooms found. Create classrooms in the database to get started."
      />
    </div>
  );
}
