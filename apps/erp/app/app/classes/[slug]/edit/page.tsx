"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  Chip,
  Spinner,
  NumberField,
  Dropdown,
  Label,
  toast,
} from "@heroui/react";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  Wand2,
  Armchair,
  Layers,
  School,
  X,
} from "lucide-react";
import {
  useClassroomDetailQuery,
  useClassroomListQuery,
  useSaveLayoutMutation,
  type BenchItem,
} from "@/app/lib/queries/classrooms";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

// ─── Types ───────────────────────────────────────────────────────────────────
interface LocalBench {
  id: string; // local ID for React keys
  label: string;
  gridX: number;
  gridY: number;
  maxStudents: number;
  isActive: boolean;
}

// ─── Label generator ─────────────────────────────────────────────────────────
function generateLabel(gridY: number, gridX: number): string {
  const row = String.fromCharCode(65 + gridY); // A, B, C...
  return `${row}${gridX + 1}`;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function LiveStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-divider bg-surface p-3 min-w-[140px]">
      <div className="flex items-center justify-center size-9 rounded-lg bg-accent/10 text-accent shrink-0">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-[10px] font-medium text-default-500 uppercase tracking-wider leading-none">
          {label}
        </p>
        <p className="text-lg font-bold text-foreground leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function ClassEditPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { activeRole } = useAuthStore();
  const isHod = activeRole === "hod";

  // Fetch classroom detail
  const {
    data: detailData,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErr,
  } = useClassroomDetailQuery(slug);

  // Fetch all classrooms (for "Copy Layout From")
  const { data: listData } = useClassroomListQuery();

  // Save mutation
  const saveMutation = useSaveLayoutMutation(slug);

  // ── Local grid state ─────────────────────────────────────
  const [benches, setBenches] = useState<LocalBench[]>([]);
  const [initialized, setInitialized] = useState(false);

  // ── Auto-generate form state ──────────────────────────────
  const [genRows, setGenRows] = useState(3);
  const [genCols, setGenCols] = useState(4);
  const [genCapacity, setGenCapacity] = useState(2);

  // Initialize local state from server data (once)
  React.useEffect(() => {
    if (detailData && !initialized) {
      setBenches(
        detailData.benches.map((b) => ({
          id: `bench-${b.gridX}-${b.gridY}`,
          label: b.label,
          gridX: b.gridX,
          gridY: b.gridY,
          maxStudents: b.maxStudents,
          isActive: b.isActive,
        }))
      );
      setInitialized(true);
    }
  }, [detailData, initialized]);

  // ── Redirect non-HOD away ─────────────────────────────────
  if (!isHod) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-md w-full border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">🚫</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Unauthorized
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only HOD can edit classroom layouts.
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

  if (detailLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="accent" />
          <p className="text-sm text-muted-foreground">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (detailError || !detailData) {
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
                {detailErr instanceof Error
                  ? detailErr.message
                  : "Classroom not found"}
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

  const { classroom } = detailData;

  // ── Computed stats ────────────────────────────────────────
  const totalBenches = benches.length;
  const activeBenches = benches.filter((b) => b.isActive).length;
  const physicalCapacity = benches.reduce((sum, b) => sum + b.maxStudents, 0);

  // ── Build the grid with extra empty slots ─────────────────
  const maxX = benches.length > 0 ? Math.max(...benches.map((b) => b.gridX)) : -1;
  const maxY = benches.length > 0 ? Math.max(...benches.map((b) => b.gridY)) : -1;

  // Extend by 1 in each direction for growth
  const gridMaxX = maxX + 1;
  const gridMaxY = maxY + 1;

  const benchMap = new Map<string, LocalBench>();
  for (const b of benches) {
    benchMap.set(`${b.gridX},${b.gridY}`, b);
  }

  // ── Handlers ──────────────────────────────────────────────
  const addBench = (gridX: number, gridY: number) => {
    const label = generateLabel(gridY, gridX);
    const newBench: LocalBench = {
      id: `bench-${gridX}-${gridY}-${Date.now()}`,
      label,
      gridX,
      gridY,
      maxStudents: 2,
      isActive: true,
    };
    setBenches((prev) => [...prev, newBench]);
  };

  const removeBench = (gridX: number, gridY: number) => {
    setBenches((prev) =>
      prev.filter((b) => !(b.gridX === gridX && b.gridY === gridY))
    );
  };

  const updateCapacity = (gridX: number, gridY: number, cap: number) => {
    setBenches((prev) =>
      prev.map((b) =>
        b.gridX === gridX && b.gridY === gridY
          ? { ...b, maxStudents: Math.max(1, Math.min(4, cap)) }
          : b
      )
    );
  };

  const autoGenerate = () => {
    const newBenches: LocalBench[] = [];
    for (let y = 0; y < genRows; y++) {
      for (let x = 0; x < genCols; x++) {
        newBenches.push({
          id: `bench-${x}-${y}-${Date.now()}-${x}-${y}`,
          label: generateLabel(y, x),
          gridX: x,
          gridY: y,
          maxStudents: genCapacity,
          isActive: true,
        });
      }
    }
    setBenches(newBenches);
    toast.success(`Generated ${genRows}×${genCols} grid with capacity ${genCapacity}`);
  };

  const copyLayoutFrom = (sourceRoomCode: string) => {
    if (!listData) return;
    const source = listData.classrooms.find(
      (c) => c.roomCode === sourceRoomCode
    );
    if (!source) return;

    // Fetch the source classroom's benches
    fetch(`/api/classes/${encodeURIComponent(sourceRoomCode)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.benches) {
          const copied: LocalBench[] = json.data.benches.map(
            (b: BenchItem, i: number) => ({
              id: `copied-${b.gridX}-${b.gridY}-${Date.now()}-${i}`,
              label: b.label,
              gridX: b.gridX,
              gridY: b.gridY,
              maxStudents: b.maxStudents,
              isActive: b.isActive,
            })
          );
          setBenches(copied);
          toast.success(`Copied layout from ${sourceRoomCode}`);
        }
      })
      .catch(() => {
        toast.danger("Failed to copy layout");
      });
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        benches: benches.map((b) => ({
          label: b.label,
          gridX: b.gridX,
          gridY: b.gridY,
          maxStudents: b.maxStudents,
          isActive: b.isActive,
        })),
      });
      toast.success("Layout saved successfully!");
    } catch (err) {
      toast.danger(
        err instanceof Error ? err.message : "Failed to save layout"
      );
    }
  };

  // Available classrooms with layouts for copy dropdown (exclude self)
  const copyableClassrooms = (listData?.classrooms || []).filter(
    (c) => c.roomCode !== slug && c.hasLayout
  );

  // Capacity color mapping
  const getCapacityColor = (cap: number) => {
    return "bg-default-100 border border-default-200 text-default-700 hover:border-default-300";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={() => router.push(`/app/classes/${slug}`)}
            aria-label="Back to view"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Edit Layout — {classroom.roomCode}
            </h1>
            <p className="text-sm text-default-500">
              {classroom.buildingName
                ? `${classroom.buildingName} · ${classroom.floor} Floor`
                : `${classroom.floor} Floor`}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onPress={handleSave}
          isDisabled={saveMutation.isPending}
          className="gap-1.5"
        >
          {saveMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <Save className="size-4" />
          )}
          Save Layout
        </Button>
      </div>

      {/* ── Live Capacity Summary ───────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <LiveStatCard label="Total Benches" value={totalBenches} icon={Layers} />
        <LiveStatCard
          label="Physical Capacity"
          value={physicalCapacity}
          icon={Armchair}
        />
        <LiveStatCard
          label="Active Benches"
          value={activeBenches}
          icon={Armchair}
        />
      </div>

      {/* ── Setup Tools ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Auto-generate form */}
        <Card className="rounded-2xl border border-divider bg-surface shadow-sm">
          <Card.Content className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="size-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">
                Auto-Generate Layout
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-default-500">Rows</label>
                <NumberField
                  value={genRows}
                  onChange={(v) => setGenRows(v)}
                  minValue={1}
                  maxValue={20}
                  aria-label="Number of rows"
                >
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input className="text-center" />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-default-500">Columns</label>
                <NumberField
                  value={genCols}
                  onChange={(v) => setGenCols(v)}
                  minValue={1}
                  maxValue={20}
                  aria-label="Number of columns"
                >
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input className="text-center" />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-default-500">Default Cap.</label>
                <NumberField
                  value={genCapacity}
                  onChange={(v) => setGenCapacity(v)}
                  minValue={1}
                  maxValue={4}
                  aria-label="Default bench capacity"
                >
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input className="text-center" />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
              </div>
            </div>
            <Button
              variant="secondary"
              onPress={autoGenerate}
              className="mt-3 w-full gap-1.5"
            >
              <Wand2 className="size-3.5" />
              Generate {genRows}×{genCols} Grid
            </Button>
          </Card.Content>
        </Card>

        {/* Copy Layout */}
        <Card className="rounded-2xl border border-divider bg-surface shadow-sm">
          <Card.Content className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Copy className="size-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">
                Copy Layout From
              </h3>
            </div>
            <p className="text-xs text-default-500 mb-3">
              Select another classroom to copy its bench arrangement into this
              editor. Changes are local until you save.
            </p>
            {copyableClassrooms.length > 0 ? (
              <Dropdown>
                <Button variant="secondary" className="w-full justify-between">
                  <span>Select a classroom...</span>
                </Button>
                <Dropdown.Popover className="min-w-[200px]">
                  <Dropdown.Menu
                    onAction={(key) => copyLayoutFrom(key as string)}
                  >
                    {copyableClassrooms.map((c) => (
                      <Dropdown.Item
                        key={c.roomCode}
                        id={c.roomCode}
                        textValue={c.roomCode}
                      >
                        <Label>
                          {c.roomCode} — {c.totalBenches} benches
                        </Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : (
              <p className="text-xs text-default-400 italic">
                No other classrooms with layouts available
              </p>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* ── Grid Editor ─────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-divider bg-surface shadow-sm">
        <Card.Content className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Layout Grid Editor
            </h2>
            <div className="flex items-center gap-2">
              {benches.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                  onPress={() => {
                    setBenches([]);
                    toast.info("Layout cleared");
                  }}
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto pb-2 flex flex-col items-center justify-center">
            <div className="inline-block">
              {/* Column headers */}
              <div className="flex gap-2 mb-1 pl-8">
                {Array.from({ length: gridMaxX + 1 }).map((_, x) => (
                  <div
                    key={x}
                    className="w-[288px] text-center text-[10px] font-medium text-default-400 uppercase shrink-0"
                  >
                    Col {x + 1}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              <div className="flex flex-col gap-2">
                {Array.from({ length: gridMaxY + 1 }).map((_, y) => (
                  <div key={y} className="flex items-center gap-2">
                    {/* Row label */}
                    <div className="w-6 text-right text-[10px] font-medium text-default-400 shrink-0">
                      {String.fromCharCode(65 + y)}
                    </div>
                    {Array.from({ length: gridMaxX + 1 }).map((_, x) => {
                      const bench = benchMap.get(`${x},${y}`);
                      return (
                        <div
                          key={`${x}-${y}`}
                          className="w-[288px] flex items-center justify-center shrink-0"
                        >
                          {bench ? (
                            <div
                              className={`flex flex-col items-center justify-center rounded-xl border p-2 min-h-[64px] relative group transition-all duration-200 ${getCapacityColor(
                                bench.maxStudents
                              )}`}
                              style={{ width: `${bench.maxStudents * 72}px` }}
                            >
                              {/* Delete button */}
                              <button
                                onClick={() => removeBench(x, y)}
                                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:scale-110 cursor-pointer z-10"
                                aria-label={`Remove bench ${bench.label}`}
                              >
                                <X className="size-3" />
                              </button>

                              {/* Label */}
                              <span className="text-xs font-bold leading-none">
                                {bench.label}
                              </span>

                              {/* Capacity controls */}
                              <div className="flex items-center gap-0.5 mt-1.5">
                                <button
                                  onClick={() =>
                                    updateCapacity(x, y, bench.maxStudents - 1)
                                  }
                                  disabled={bench.maxStudents <= 1}
                                  className="size-4 rounded bg-white/50 text-[10px] font-bold flex items-center justify-center hover:bg-white/80 disabled:opacity-30 cursor-pointer transition-colors"
                                >
                                  −
                                </button>
                                <span className="text-[10px] font-semibold w-3 text-center">
                                  {bench.maxStudents}
                                </span>
                                <button
                                  onClick={() =>
                                    updateCapacity(x, y, bench.maxStudents + 1)
                                  }
                                  disabled={bench.maxStudents >= 4}
                                  className="size-4 rounded bg-white/50 text-[10px] font-bold flex items-center justify-center hover:bg-white/80 disabled:opacity-30 cursor-pointer transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Empty slot — show add button
                            <button
                              onClick={() => addBench(x, y)}
                              className="flex items-center justify-center rounded-xl border-2 border-dashed border-default-200 min-w-[72px] min-h-[64px] text-default-300 hover:border-accent hover:text-accent hover:bg-accent/5 transition-all duration-200 cursor-pointer group/add"
                              aria-label={`Add bench at row ${String.fromCharCode(65 + y)}, column ${x + 1}`}
                            >
                              <Plus className="size-5 transition-transform duration-200 group-hover/add:scale-110" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>



          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-divider">
            <span className="text-[11px] font-medium text-default-400 uppercase tracking-wider">
              Legend:
            </span>
            <div className="flex items-center gap-1.5">
              <div className="size-4 rounded border-2 bg-default-100 border-default-300" />
              <span className="text-[11px] text-default-500">Configured Bench</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-4 rounded border-2 border-dashed border-default-200" />
              <span className="text-[11px] text-default-500">
                Empty Slot (click + to add)
              </span>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
