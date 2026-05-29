"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Chip,
  Spinner,
  toast,
} from "@heroui/react";
import { Save, Plus, Trash2, CalendarDays, Clock } from "lucide-react";
import { useSaveStepMutation, type ExamSubjectItem, type ExamScheduleItem } from "@/app/lib/queries/exam-wizard";

interface Step5Props {
  examId: number;
  subjects: ExamSubjectItem[];
  schedules: ExamScheduleItem[];
  onSaved: () => void;
  onSaving: () => void;
  onError: () => void;
}

interface ScheduleSlot {
  tempId: string;
  examSubjectId: number;
  examDate: string;
  startTime: string;
  endTime: string;
}

function generateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function Step5Schedule({ examId, subjects, schedules: savedSchedules, onSaved, onSaving, onError }: Step5Props) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const saveMutation = useSaveStepMutation(examId, "schedule");

  // Subject lookup
  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  // Hydrate from saved
  useEffect(() => {
    if (savedSchedules.length > 0) {
      setSlots(
        savedSchedules.map((s) => ({
          tempId: crypto.randomUUID(),
          examSubjectId: s.examSubjectId,
          examDate: s.examDate,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      );
    }
  }, [savedSchedules]);

  const scheduledSubjectIds = new Set(slots.map((s) => s.examSubjectId));
  const unscheduledSubjects = subjects.filter((s) => !scheduledSubjectIds.has(s.id));

  const addSlot = (examSubjectId: number) => {
    const sub = subjectMap.get(examSubjectId);
    const defaultStart = "09:30";
    const duration = sub?.durationMinutes || 60;
    setSlots((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        examSubjectId,
        examDate: "",
        startTime: defaultStart,
        endTime: generateEndTime(defaultStart, duration),
      },
    ]);
  };

  const removeSlot = (tempId: string) => {
    setSlots((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateSlot = (tempId: string, field: keyof ScheduleSlot, value: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const updated = { ...s, [field]: value };
        // Auto-calculate end time when start time changes
        if (field === "startTime") {
          const sub = subjectMap.get(s.examSubjectId);
          updated.endTime = generateEndTime(value, sub?.durationMinutes || 60);
        }
        return updated;
      })
    );
  };

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();
    slots.forEach((s) => {
      const key = s.examDate || "unset";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [slots]);

  const handleSave = async () => {
    // Validate
    const invalid = slots.find((s) => !s.examDate || !s.startTime || !s.endTime);
    if (invalid) {
      toast.warning("All scheduled subjects need a date and time");
      return;
    }
    if (slots.length === 0) {
      toast.warning("Schedule at least one subject");
      return;
    }

    onSaving();
    try {
      await saveMutation.mutateAsync({
        slots: slots.map((s) => ({
          examSubjectId: s.examSubjectId,
          examDate: s.examDate,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
      onSaved();
      toast.success("Schedule saved");
    } catch (err) {
      onError();
      toast.danger("Failed to save", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (subjects.length === 0) {
    return (
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm p-8 text-center">
        <p className="text-default-500 text-sm">Complete Step 4 (Subject Selection) first.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Schedule Builder */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider/20">
            <h2 className="text-lg font-semibold text-foreground">Schedule Planning</h2>
            <p className="text-sm text-default-500 mt-0.5">Assign dates and time slots for each subject.</p>
          </div>

          <div className="p-5 flex flex-col gap-3">
            {slots.length === 0 && (
              <div className="py-8 text-center text-default-400 text-sm">
                No subjects scheduled yet. Add from the sidebar.
              </div>
            )}

            {slots.map((slot) => {
              const sub = subjectMap.get(slot.examSubjectId);
              return (
                <div
                  key={slot.tempId}
                  className="flex items-center gap-3 p-4 rounded-xl border border-divider/20 bg-default-50/30 hover:bg-default-50 transition-colors"
                >
                  {/* Subject info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {sub?.subjectName || `Subject #${slot.examSubjectId}`}
                    </p>
                    <p className="text-xs text-default-400">
                      {sub?.durationMinutes || 60} min • {sub?.subjectCode || ""}
                    </p>
                  </div>

                  {/* Date */}
                  <input
                    type="date"
                    value={slot.examDate}
                    onChange={(e) => updateSlot(slot.tempId, "examDate", e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-divider/30 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 w-36"
                  />

                  {/* Start Time */}
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(slot.tempId, "startTime", e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-divider/30 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 w-28"
                  />

                  <span className="text-xs text-default-400">→</span>

                  {/* End Time */}
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(slot.tempId, "endTime", e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-divider/30 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 w-28"
                  />

                  <Button
                    variant="tertiary"
                    size="sm"
                    isIconOnly
                    aria-label="Remove"
                    onPress={() => removeSlot(slot.tempId)}
                    className="text-danger shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Unscheduled Panel */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 flex flex-col gap-4">
          <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-divider/20">
              <h3 className="text-sm font-semibold text-foreground">Unscheduled</h3>
              <p className="text-xs text-default-400 mt-0.5">{unscheduledSubjects.length} remaining</p>
            </div>
            <div className="p-3 flex flex-col gap-1.5 max-h-[400px] overflow-y-auto">
              {unscheduledSubjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => addSlot(sub.id)}
                  className="flex items-center gap-2 p-2.5 rounded-lg text-left hover:bg-accent/5 border border-transparent hover:border-accent/20 transition-all duration-150 w-full group"
                >
                  <div className="flex items-center justify-center size-6 rounded-md bg-danger/10 text-danger group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                    <Plus className="size-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{sub.subjectName}</p>
                    <p className="text-[10px] text-default-400">{sub.durationMinutes} min</p>
                  </div>
                  <Chip size="sm" variant="tertiary" color="danger" className="text-[10px]">Pending</Chip>
                </button>
              ))}
              {scheduledSubjectIds.size > 0 && (
                <div className="pt-2 border-t border-divider/20 mt-2">
                  <p className="text-[10px] font-medium text-default-400 uppercase tracking-wider mb-1.5 px-2">Scheduled</p>
                  {subjects.filter((s) => scheduledSubjectIds.has(s.id)).map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 p-2 px-2.5 rounded-lg">
                      <div className="size-2 rounded-full bg-success" />
                      <p className="text-xs text-default-500 truncate flex-1">{sub.subjectName}</p>
                    </div>
                  ))}
                </div>
              )}
              {subjects.length === 0 && (
                <p className="text-xs text-default-400 text-center py-4">No subjects to schedule.</p>
              )}
            </div>
          </Card>

          <Button
            fullWidth
            onPress={handleSave}
            isPending={saveMutation.isPending}
            isDisabled={slots.length === 0}
          >
            {({ isPending: p }) => (
              <>
                {p && <Spinner color="current" size="sm" />}
                <Save className="size-4" />
                Save Schedule
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
