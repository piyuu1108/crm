"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Chip,
  Spinner,
  Skeleton,
  toast,
} from "@heroui/react";
import { Save, Building2, ArrowRight, GripVertical, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";
import { useSaveStepMutation, type ExamHallItem, type ExamSummary } from "@/app/lib/queries/exam-wizard";

interface Step6Props {
  examId: number;
  halls: ExamHallItem[];
  summary: ExamSummary;
  onSaved: () => void;
  onSaving: () => void;
  onError: () => void;
}

interface ClassroomOption {
  id: number;
  roomCode: string;
  floor: string;
  lectureCapacity: number;
  totalBenches: number;
  benchCapacity: number;
}

export function Step6Halls({ examId, halls: savedHalls, summary, onSaved, onSaving, onError }: Step6Props) {
  const [orderedRooms, setOrderedRooms] = useState<ClassroomOption[]>([]);
  const saveMutation = useSaveStepMutation(examId, "halls");

  // Fetch available classrooms
  const { data: classroomsData, isLoading } = useQuery({
    queryKey: ["classrooms-for-exam"],
    queryFn: async () => {
      const res = await fetchWithTimeout("/api/classes", {
        credentials: "include",
        cache: "no-store",
        timeoutMs: 8000,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load");
      return json.data as { classrooms: any[] };
    },
    staleTime: 120_000,
  });

  const allClassrooms: ClassroomOption[] = useMemo(() => {
    if (!classroomsData?.classrooms) return [];
    return classroomsData.classrooms
      .filter((c: any) => c.isActive && c.hasLayout)
      .map((c: any) => ({
        id: c.id,
        roomCode: c.roomCode,
        floor: c.floor,
        lectureCapacity: c.lectureCapacity,
        totalBenches: c.totalBenches || 0,
        benchCapacity: c.physicalCapacity || 0,
      }));
  }, [classroomsData]);

  // Hydrate from saved
  useEffect(() => {
    if (savedHalls.length > 0) {
      // Restore saved order
      const ordered = savedHalls
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((h) => ({
          id: h.classroomId,
          roomCode: h.roomCode,
          floor: h.floor,
          lectureCapacity: h.lectureCapacity,
          totalBenches: h.totalBenches,
          benchCapacity: h.benchCapacity,
        }));
      setOrderedRooms(ordered);
    }
  }, [savedHalls]);

  const selectedIds = new Set(orderedRooms.map((r) => r.id));
  const availableRooms = allClassrooms.filter((c) => !selectedIds.has(c.id));

  const addRoom = (room: ClassroomOption) => {
    setOrderedRooms((prev) => [...prev, room]);
  };

  const removeRoom = (roomId: number) => {
    setOrderedRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setOrderedRooms((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setOrderedRooms((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  // Capacity calculations
  const totalCapacity = orderedRooms.reduce((sum, r) => sum + r.benchCapacity, 0);
  const utilization = summary.totalStudents > 0
    ? Math.round((summary.totalStudents / Math.max(totalCapacity, 1)) * 100)
    : 0;
  const remaining = totalCapacity - summary.totalStudents;

  const handleSave = async () => {
    if (orderedRooms.length === 0) {
      toast.warning("Select at least one classroom");
      return;
    }
    onSaving();
    try {
      await saveMutation.mutateAsync({
        allocations: orderedRooms.map((r, i) => ({
          classroomId: r.id,
          sequenceOrder: i + 1,
        })),
      });
      onSaved();
      toast.success("Hall allocation saved");
    } catch (err) {
      onError();
      toast.danger("Failed to save", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm p-6">
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Main Content */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        {/* Info Banner */}
        <Card className="rounded-2xl border border-accent/20 bg-accent/5 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-accent/10 text-accent shrink-0">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sequential Room Filling</p>
              <p className="text-xs text-default-500">
                Students will be allocated sequentially: when the first room fills up, allocation continues to the next.
              </p>
            </div>
          </div>
        </Card>

        {/* Selected Rooms (ordered) */}
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider/20">
            <h2 className="text-lg font-semibold text-foreground">Allocation Order</h2>
            <p className="text-sm text-default-500 mt-0.5">Click rooms below to add them, then reorder.</p>
          </div>

          <div className="p-4 flex flex-col gap-2">
            {orderedRooms.length === 0 && (
              <div className="py-8 text-center text-default-400 text-sm">
                No classrooms selected. Click available rooms to add them.
              </div>
            )}

            {orderedRooms.map((room, index) => {
              // Calculate cumulative fill
              const cumBefore = orderedRooms.slice(0, index).reduce((s, r) => s + r.benchCapacity, 0);
              const cumAfter = cumBefore + room.benchCapacity;
              const filledPercent = Math.min(100, Math.round(
                (Math.max(0, Math.min(summary.totalStudents - cumBefore, room.benchCapacity)) / Math.max(room.benchCapacity, 1)) * 100
              ));

              return (
                <div
                  key={room.id}
                  className="flex items-center gap-3 p-4 rounded-xl border border-divider/20 bg-default-50/30 hover:bg-default-50 transition-colors group"
                >
                  <span className="text-lg font-bold text-accent min-w-[2ch] text-center">{index + 1}</span>
                  <ArrowRight className="size-3.5 text-default-300 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{room.roomCode}</p>
                      <Chip size="sm" variant="tertiary" className="text-[10px]">{room.floor}</Chip>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-default-400">{room.benchCapacity} seats</span>
                      <span className="text-xs text-default-400">{room.totalBenches} benches</span>
                    </div>
                    {/* Fill bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-default-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          filledPercent >= 100 ? "bg-danger" : filledPercent > 80 ? "bg-warning" : "bg-accent"
                        }`}
                        style={{ width: `${filledPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-default-400 mt-0.5">{filledPercent}% estimated fill</p>
                  </div>

                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="text-xs text-default-400 hover:text-foreground disabled:opacity-30 px-1"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === orderedRooms.length - 1}
                      className="text-xs text-default-400 hover:text-foreground disabled:opacity-30 px-1"
                    >
                      ▼
                    </button>
                  </div>

                  <Button
                    variant="tertiary"
                    size="sm"
                    isIconOnly
                    aria-label="Remove"
                    onPress={() => removeRoom(room.id)}
                    className="text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    ✕
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Available Rooms */}
        {availableRooms.length > 0 && (
          <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-divider/20">
              <h3 className="text-sm font-semibold text-foreground">Available Classrooms</h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {availableRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => addRoom(room)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-divider/20 bg-transparent hover:bg-accent/5 hover:border-accent/30 transition-all duration-150 text-left group"
                >
                  <div className="flex items-center justify-center size-8 rounded-lg bg-default-100 text-default-500 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{room.roomCode}</p>
                    <p className="text-xs text-default-400">{room.benchCapacity} seats • {room.floor}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Capacity Summary Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 flex flex-col gap-4">
          <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-divider/20">
              <h3 className="text-sm font-semibold text-foreground">Capacity</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-xl bg-accent/10 text-accent">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{summary.totalStudents}</p>
                  <p className="text-xs text-default-500">Eligible Students</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-xl bg-default-100 text-default-500">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{totalCapacity}</p>
                  <p className="text-xs text-default-500">Available Seats</p>
                </div>
              </div>

              {/* Utilization bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-default-500">Utilization</span>
                  <span className={`font-semibold ${utilization > 100 ? "text-danger" : "text-foreground"}`}>
                    {utilization}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-default-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      utilization > 100 ? "bg-danger" : utilization > 90 ? "bg-warning" : "bg-accent"
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>

              {remaining < 0 && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                  <p className="text-xs font-medium text-danger">
                    ⚠ {Math.abs(remaining)} seats still required
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Button
            fullWidth
            onPress={handleSave}
            isPending={saveMutation.isPending}
            isDisabled={orderedRooms.length === 0}
          >
            {({ isPending: p }) => (
              <>
                {p && <Spinner color="current" size="sm" />}
                <Save className="size-4" />
                Save Allocation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
