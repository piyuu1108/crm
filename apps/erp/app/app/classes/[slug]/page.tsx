"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Chip, Spinner, Tooltip } from "@heroui/react";
import { ArrowLeft, Pencil, Armchair, School, Layers } from "lucide-react";
import {
  useClassroomDetailQuery,
  type BenchItem,
} from "@/app/lib/queries/classrooms";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

// ─── Bench cell (read-only) ──────────────────────────────────────────────────
function BenchCell({ bench }: { bench: BenchItem }) {
  const capacityColor =
    bench.maxStudents === 1
      ? "bg-accent/10 border-accent/30 text-accent"
      : bench.maxStudents === 2
        ? "bg-success/10 border-success/30 text-success"
        : bench.maxStudents === 3
          ? "bg-warning/10 border-warning/30 text-warning"
          : "bg-danger/10 border-danger/30 text-danger";

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div
          className={`flex flex-col items-center justify-center rounded-xl border-2 p-2 min-w-[60px] min-h-[52px] transition-all duration-200 cursor-default select-none ${
            bench.isActive
              ? capacityColor
              : "bg-default-100 border-default-200 text-default-400 opacity-50"
          }`}
        >
          <span className="text-xs font-bold leading-none">{bench.label}</span>
          <span className="text-[10px] font-medium leading-none mt-1 opacity-70">
            {bench.maxStudents}×
          </span>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="px-1 py-1 text-xs">
          <p>
            <strong>Label:</strong> {bench.label}
          </p>
          <p>
            <strong>Capacity:</strong> {bench.maxStudents} student
            {bench.maxStudents > 1 ? "s" : ""}
          </p>
          <p>
            <strong>Position:</strong> ({bench.gridX}, {bench.gridY})
          </p>
          <p>
            <strong>Status:</strong> {bench.isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}

// ─── Empty cell placeholder ──────────────────────────────────────────────────
function EmptyCell() {
  return (
    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-default-200 min-w-[60px] min-h-[52px] opacity-30" />
  );
}

// ─── Build grid from benches ─────────────────────────────────────────────────
function buildGrid(benches: BenchItem[]) {
  if (benches.length === 0) return { grid: [], maxX: 0, maxY: 0 };

  const maxX = Math.max(...benches.map((b) => b.gridX));
  const maxY = Math.max(...benches.map((b) => b.gridY));

  const benchMap = new Map<string, BenchItem>();
  for (const b of benches) {
    benchMap.set(`${b.gridX},${b.gridY}`, b);
  }

  const grid: (BenchItem | null)[][] = [];
  for (let y = 0; y <= maxY; y++) {
    const row: (BenchItem | null)[] = [];
    for (let x = 0; x <= maxX; x++) {
      row.push(benchMap.get(`${x},${y}`) || null);
    }
    grid.push(row);
  }

  return { grid, maxX, maxY };
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-divider bg-surface p-4">
      <div className="flex items-center justify-center size-10 rounded-lg bg-accent/10 text-accent shrink-0">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-default-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function ClassViewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { activeRole } = useAuthStore();
  const isHod = activeRole === "hod";

  const { data, isLoading, isError, error } = useClassroomDetailQuery(slug);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="accent" />
          <p className="text-sm text-muted-foreground">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-md w-full border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">!</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load classroom
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Classroom not found"}
              </p>
            </div>
            <Button variant="secondary" onPress={() => router.back()}>
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  const { classroom, benches, stats } = data;
  const { grid } = buildGrid(benches);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={() => router.push("/app/classes")}
            aria-label="Back to classes"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {classroom.roomCode}
            </h1>
            <p className="text-sm text-default-500">
              {classroom.buildingName
                ? `${classroom.buildingName} · ${classroom.floor} Floor`
                : `${classroom.floor} Floor`}
            </p>
          </div>
        </div>
        {isHod && (
          <Button
            onPress={() => router.push(`/app/classes/${slug}/edit`)}
            className="gap-1.5"
          >
            <Pencil className="size-4" />
            Edit Layout
          </Button>
        )}
      </div>

      {/* ── Classroom Details ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Room Code" value={classroom.roomCode} icon={School} />
        <StatCard
          label="Lecture Capacity"
          value={classroom.lectureCapacity}
          icon={Armchair}
        />
        <StatCard
          label="Total Benches"
          value={stats.totalBenches}
          icon={Layers}
        />
        <StatCard
          label="Physical Capacity"
          value={stats.physicalCapacity}
          icon={Armchair}
        />
      </div>

      {/* ── Bench Layout Grid ───────────────────────────────────── */}
      <Card className="rounded-2xl border border-divider bg-surface shadow-sm">
        <Card.Content className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Bench Layout
            </h2>
            <div className="flex items-center gap-3">
              <Chip size="sm" variant="soft" color="success">
                Active: {stats.activeBenches}
              </Chip>
              <Chip size="sm" variant="soft">
                Total: {stats.totalBenches}
              </Chip>
            </div>
          </div>

          {benches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-16 rounded-2xl bg-default-100 flex items-center justify-center mb-4">
                <Layers className="size-8 text-default-400" />
              </div>
              <p className="text-sm font-medium text-default-500">
                No layout configured
              </p>
              <p className="text-xs text-default-400 mt-1">
                {isHod
                  ? "Click 'Edit Layout' to design the bench arrangement"
                  : "The HOD needs to configure the layout for this classroom"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              {/* Column headers */}
              <div className="flex gap-2 mb-1 pl-8">
                {grid[0]?.map((_, x) => (
                  <div
                    key={x}
                    className="min-w-[60px] text-center text-[10px] font-medium text-default-400 uppercase"
                  >
                    Col {x + 1}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              <div className="flex flex-col gap-2">
                {grid.map((row, y) => (
                  <div key={y} className="flex items-center gap-2">
                    {/* Row label */}
                    <div className="w-6 text-right text-[10px] font-medium text-default-400 shrink-0">
                      {String.fromCharCode(65 + y)}
                    </div>
                    {row.map((cell, x) => (
                      <div key={`${x}-${y}`}>
                        {cell ? <BenchCell bench={cell} /> : <EmptyCell />}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          {benches.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-divider">
              <span className="text-[11px] font-medium text-default-400 uppercase tracking-wider">
                Capacity Legend:
              </span>
              {[
                { n: 1, color: "bg-accent/10 border-accent/30 text-accent" },
                { n: 2, color: "bg-success/10 border-success/30 text-success" },
                { n: 3, color: "bg-warning/10 border-warning/30 text-warning" },
                { n: 4, color: "bg-danger/10 border-danger/30 text-danger" },
              ].map(({ n, color }) => (
                <div key={n} className="flex items-center gap-1.5">
                  <div
                    className={`size-4 rounded border-2 ${color}`}
                  />
                  <span className="text-[11px] text-default-500">
                    {n} student{n > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
