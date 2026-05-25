"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  Button,
  Card,
  Chip,
  Dropdown,
  Label,
  Spinner,
  Switch,
  toast,
  AlertDialog,
} from "@heroui/react";
import { Plus, Funnel, FloppyDisk, TriangleExclamation } from "@gravity-ui/icons";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  useTimetableGridQuery,
  useTimetableDivisionsQuery,
  useSaveTimetableMutation,
  usePublishTimetableMutation,
  timetableKeys,
  type TimetableSlot,
  type TimetableResponse,
} from "@/app/lib/queries/timetable";
import { useConflictMap } from "./use-conflict-map";
import { TimetableGrid } from "./timetable-grid";
import { SlotModal } from "./slot-modal";

// ─── Helper: derive year prefix for display ──────────────────────────────────

function getYearLabel(semesterNo: number): string {
  if (semesterNo <= 2) return "FY";
  if (semesterNo <= 4) return "SY";
  return "TY";
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl border border-divider bg-default/10 animate-pulse"
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimetableManagementPage() {
  const [selectedDivisionId, setSelectedDivisionId] = useState<number>(0);
  const [localSlots, setLocalSlots] = useState<TimetableSlot[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [prefillDay, setPrefillDay] = useState<string | undefined>();
  const [prefillStartTime, setPrefillStartTime] = useState<string | undefined>();
  const [prefillEndTime, setPrefillEndTime] = useState<string | undefined>();

  // Drag and drop confirmation state
  const [confirmWarnings, setConfirmWarnings] = useState<any[]>([]);
  const [pendingDropSlot, setPendingDropSlot] = useState<TimetableSlot | null>(null);

  const queryClient = useQueryClient();
  const router = useRouter();
  const { activeRole } = useAuthStore();

  useEffect(() => {
    if (activeRole === "principal" || activeRole === "vice_principal") {
      router.replace("/app/academics/timetable");
    }
  }, [activeRole, router]);

  if (activeRole === "principal" || activeRole === "vice_principal") {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  // ── Data fetching ──
  const { data: divisionsList, isLoading: isDivisionsLoading } = useTimetableDivisionsQuery();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useTimetableGridQuery(selectedDivisionId);

  const saveMutation = useSaveTimetableMutation(selectedDivisionId);
  const publishMutation = usePublishTimetableMutation();

  // Sync local slots from server data
  useEffect(() => {
    if (data?.entries && !isDirty) {
      const serverSlots: TimetableSlot[] = data.entries.map((e) => {
        // Find faculty ID from assignments
        const assignment = data.assignments.find((a) => a.id === e.assignmentId);
        return {
          id: e.id,
          dayOfWeek: e.dayOfWeek,
          startTime: e.startTime,
          endTime: e.endTime,
          assignmentId: e.assignmentId,
          color: e.color || "#6366f1",
          isLab: e.isLab,
          labId: e.labId,
          subjectName: e.subjectName,
          facultyName: e.facultyName,
          facultyId: assignment?.facultyId || 0,
        };
      });
      setLocalSlots(serverSlots);
      setIsDirty(false);
    }
  }, [data, isDirty]);

  // ── Conflict map ──
  const { checkConflict } = useConflictMap(
    selectedDivisionId,
    localSlots,
    data?.facultyConflicts || [],
    data?.labConflicts || [],
    data?.assignments || []
  );

  // ── Cell click: open modal for adding ──
  const handleCellClick = useCallback(
    (day: string, startTime: string, endTime: string) => {
      refetch(); // Fetch latest allocations in background for conflict check
      setEditingSlot(null);
      setPrefillDay(day);
      setPrefillStartTime(startTime);
      setPrefillEndTime(endTime);
      setModalOpen(true);
    },
    [refetch]
  );

  // ── Edit slot ──
  const handleEditSlot = useCallback((slot: TimetableSlot) => {
    refetch(); // Fetch latest allocations in background for conflict check
    setEditingSlot(slot);
    setPrefillDay(undefined);
    setPrefillStartTime(undefined);
    setPrefillEndTime(undefined);
    setModalOpen(true);
  }, [refetch]);

  // ── Delete slot ──
  const handleDeleteSlot = useCallback((slot: TimetableSlot) => {
    setLocalSlots((prev) => prev.filter((s) => {
      if (slot.id) return s.id !== slot.id;
      return !(
        s.dayOfWeek === slot.dayOfWeek &&
        s.startTime === slot.startTime &&
        s.endTime === slot.endTime &&
        s.assignmentId === slot.assignmentId
      );
    }));
    setIsDirty(true);
    toast.success("Slot removed", {
      description: `${slot.subjectName} on ${slot.dayOfWeek} removed from timetable`,
    });
  }, []);

  // ── Add/Edit slot submission ──
  const handleSlotSubmit = useCallback(
    (newSlots: TimetableSlot[]) => {
      setLocalSlots((prev) => {
        let updated = [...prev];

        for (const slot of newSlots) {
          // Remove existing slot at same day/time (edit scenario)
          updated = updated.filter(
            (s) =>
              !(
                s.dayOfWeek === slot.dayOfWeek &&
                s.startTime === slot.startTime &&
                s.endTime === slot.endTime
              )
          );
          // Add the new slot
          updated.push(slot);
        }

        return updated;
      });
      setIsDirty(true);
    },
    []
  );

  // ── Drag and Drop ──
  const applyPendingDrop = useCallback(() => {
    if (!pendingDropSlot) return;
    
    setLocalSlots((prev) => {
      // Do not remove old slot (it's a copy)
      
      // Also remove any existing slot at the target time to overwrite
      const final = prev.filter(
        (s) =>
          !(
            s.dayOfWeek === pendingDropSlot.dayOfWeek &&
            s.startTime === pendingDropSlot.startTime &&
            s.endTime === pendingDropSlot.endTime
          )
      );
      
      final.push(pendingDropSlot);
      return final;
    });
    
    setIsDirty(true);
    setConfirmWarnings([]);
    setPendingDropSlot(null);
  }, [pendingDropSlot]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const [prefix, day, startTime, endTime] = String(over.id).split("-");
      if (prefix !== "cell" || !day || !startTime || !endTime) return;

      const slot = active.data.current?.slot as TimetableSlot;
      if (!slot) return;

      // If dropped on same cell, do nothing
      if (slot.dayOfWeek === day && slot.startTime.slice(0, 5) === startTime) {
        return;
      }

      // Check conflicts
      const conflicts = checkConflict(
        day,
        startTime,
        endTime,
        slot.assignmentId,
        slot.isLab || false,
        slot.labId || null,
        undefined // Do not exclude any slots since this is a copy operation
      );

      const hasDivisionConflict = conflicts.some((c) => c.type === "division");

      if (hasDivisionConflict) {
        toast.danger("Cannot move lecture", {
          description: "There is already a lecture assigned to this division at the selected time.",
        });
        return;
      }

      const updatedSlot = {
        ...slot,
        id: undefined, // Clear the id so it's treated as a new entry
        dayOfWeek: day,
        startTime,
        endTime,
      };

      if (conflicts.length > 0) {
        setConfirmWarnings(conflicts);
        setPendingDropSlot(updatedSlot);
        return;
      }

      // No conflicts, apply immediately
      setLocalSlots((prev) => {
        const updated = [...prev]; // Keep original slot (copy behavior)
        updated.push(updatedSlot);
        return updated;
      });
      setIsDirty(true);
    },
    [checkConflict]
  );

  // ── Save all changes ──
  const handleSave = async () => {
    if (!selectedDivisionId) return;

    try {
      const entries = localSlots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        assignmentId: s.assignmentId,
        color: s.color,
        isLab: s.isLab,
        labId: s.labId,
      }));

      await saveMutation.mutateAsync(entries);
      setIsDirty(false);
      toast.success("Timetable saved", {
        description: `${entries.length} slot(s) saved successfully`,
      });
    } catch (err) {
      toast.danger("Save failed", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  // ── Publish toggle ──
  const handlePublishToggle = async (isSelected: boolean) => {
    if (!selectedDivisionId) return;

    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Save them before publishing?"
      );
      if (!confirmed) return;
      await handleSave();
    }

    const newStatus = isSelected ? "published" : "draft";
    try {
      await publishMutation.mutateAsync({
        divisionId: selectedDivisionId,
        status: newStatus,
      });
      toast.success(
        newStatus === "published" ? "Timetable published" : "Timetable unpublished",
        {
          description:
            newStatus === "published"
              ? "Students can now view the timetable"
              : "Timetable is now in draft mode",
        }
      );
    } catch (err) {
      toast.danger("Toggle failed", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  // ── Error recovery ──
  const handleRecover = useCallback(() => {
    queryClient.removeQueries({ queryKey: timetableKeys.grid(selectedDivisionId) });
    void refetch();
    router.refresh();
  }, [selectedDivisionId, queryClient, refetch, router]);

  // ── Division name for header ──
  const divisionDisplay = useMemo(() => {
    if (!data?.division) {
      // Fallback: use the divisions list
      const div = divisionsList?.find((d) => d.id === selectedDivisionId);
      if (div) return `${getYearLabel(div.semesterNo)} ${div.displayName}`;
      return null;
    }
    const d = data.division;
    return `${getYearLabel(d.semesterNo)} ${d.displayName}`;
  }, [data, divisionsList, selectedDivisionId]);

  const publishStatus = data?.division?.publishStatus || "draft";
  const isPublished = publishStatus === "published";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Timetable Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage class schedules division-wise using the grid
          </p>
        </div>
      </div>

      {/* ── Division Selector ─── */}
      <Card className="border border-divider p-4">
        <Card.Content>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Label className="text-sm font-medium whitespace-nowrap">Division:</Label>
              <Dropdown>
                <Button variant="secondary" size="sm" className="min-w-[220px] justify-between">
                  <Funnel className="size-4" />
                  {divisionDisplay || "Select Division"}
                </Button>
                <Dropdown.Popover className="min-w-[260px] max-h-[320px] overflow-y-auto">
                  <Dropdown.Menu
                    selectionMode="single"
                    selectedKeys={
                      selectedDivisionId ? new Set([String(selectedDivisionId)]) : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0] as string;
                      const newId = key ? Number(key) : 0;
                      if (newId !== selectedDivisionId) {
                        setSelectedDivisionId(newId);
                        setLocalSlots([]);
                        setIsDirty(false);
                      }
                    }}
                  >
                    {(divisionsList ?? []).map((div) => (
                      <Dropdown.Item
                        key={div.id}
                        id={String(div.id)}
                        textValue={div.displayName}
                      >
                        <Dropdown.ItemIndicator />
                        <Label>
                          <span className="font-mono text-xs font-medium">
                            {getYearLabel(div.semesterNo)} {div.displayName}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            ({div.specialization} · Sem {div.semesterNo})
                          </span>
                        </Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>

            {/* Status + Publish + Actions */}
            {selectedDivisionId > 0 && data && (
              <div className="flex items-center gap-3">
                {/* Publish toggle */}
                <Switch
                  isSelected={isPublished}
                  onChange={(val) => { void handlePublishToggle(val); }}
                  isDisabled={publishMutation.isPending || saveMutation.isPending}
                  size="sm"
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>
                    <Label className="text-sm font-medium">Publish to Students</Label>
                  </Switch.Content>
                </Switch>

                {/* Add Slot button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    refetch(); // Fetch latest allocations in background for conflict check
                    setEditingSlot(null);
                    setPrefillDay(undefined);
                    setPrefillStartTime(undefined);
                    setPrefillEndTime(undefined);
                    setModalOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Add Slot
                </Button>

                {/* Save button */}
                <Button
                  size="sm"
                  isDisabled={!isDirty || saveMutation.isPending}
                  onPress={handleSave}
                >
                  {saveMutation.isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <FloppyDisk className="size-4" />
                  )}
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>

          {isDirty && (
            <p className="mt-2 text-xs text-warning">
              ⚠ You have unsaved changes. Click "Save" to persist your timetable.
            </p>
          )}
        </Card.Content>
      </Card>

      {/* ── Grid / States ─── */}
      {!selectedDivisionId ? (
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-5xl">📅</div>
            <h2 className="text-lg font-semibold text-foreground">
              Select a Division
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Choose a division from the dropdown above to view and manage its timetable.
            </p>
          </Card.Content>
        </Card>
      ) : isLoading ? (
        <GridSkeleton />
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load timetable
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
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
            <div className="text-5xl">📚</div>
            <h2 className="text-lg font-semibold text-foreground">
              No Subject Assignments
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              This division has no subject-faculty assignments yet.
              Please assign subjects to this division first under
              {" "}<span className="font-medium text-accent">Administration → Subject Assignments</span>.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{localSlots.length}</strong> slot(s) scheduled
            </span>
            <span>·</span>
            <span>
              <strong className="text-foreground">{data?.assignments.length || 0}</strong> subject-faculty assignment(s) available
            </span>
          </div>

          <DndContext onDragEnd={handleDragEnd}>
            <TimetableGrid
              slots={localSlots}
              onCellClick={handleCellClick}
              onEditSlot={handleEditSlot}
              onDeleteSlot={handleDeleteSlot}
            />
          </DndContext>
        </>
      )}

      {/* ── Drag Conflict Modal ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={confirmWarnings.length > 0}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmWarnings([]);
              setPendingDropSlot(null);
            }
          }}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning">
                  <TriangleExclamation className="size-5" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Scheduling Conflicts</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm">There are conflicts with moving this lecture:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-sm text-muted-foreground">
                  {confirmWarnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
                <p className="text-sm mt-2">Do you want to continue anyway?</p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  variant="tertiary"
                  onPress={() => {
                    setConfirmWarnings([]);
                    setPendingDropSlot(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="danger" onPress={applyPendingDrop}>
                  Continue Anyway
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* ── Slot Modal ─── */}
      <SlotModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        assignments={data?.assignments || []}
        editingSlot={editingSlot}
        prefillDay={prefillDay}
        prefillStartTime={prefillStartTime}
        prefillEndTime={prefillEndTime}
        checkConflict={checkConflict}
        onSubmit={handleSlotSubmit}
      />
    </div>
  );
}
