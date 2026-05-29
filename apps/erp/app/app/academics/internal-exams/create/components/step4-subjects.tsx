"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Checkbox,
  Chip,
  Select,
  ListBox,
  Label,
  Spinner,
  Skeleton,
  toast,
} from "@heroui/react";
import { Save, BookOpen, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";
import { useSaveStepMutation, type ExamScope, type ExamSubjectItem } from "@/app/lib/queries/exam-wizard";

interface Step4Props {
  examId: number;
  scopes: ExamScope[];
  subjects: ExamSubjectItem[];
  onSaved: () => void;
  onSaving: () => void;
  onError: () => void;
}

interface UniqueSubject {
  subjectId: number;
  name: string;
  code: string;
  shortCode: string;
  subjectType: string;
  credit: number;
  semester: number;
  divisionNames: string[];
}

const DURATION_OPTIONS = [
  { value: "60", label: "1 Hour" },
  { value: "90", label: "1.5 Hours" },
  { value: "120", label: "2 Hours" },
  { value: "180", label: "3 Hours" },
];

export function Step4Subjects({ examId, scopes, subjects: savedSubjects, onSaved, onSaving, onError }: Step4Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<Map<number, number>>(new Map()); // subjectId -> durationMinutes
  const saveMutation = useSaveStepMutation(examId, "subjects");

  // Fetch subjects for selected divisions
  const divisionIds = useMemo(() => scopes.map((s) => s.divisionId), [scopes]);

  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ["subjects-for-exam", divisionIds],
    queryFn: async () => {
      const res = await fetchWithTimeout(`/api/subjects?divisionIds=${divisionIds.join(",")}`, {
        credentials: "include",
        cache: "no-store",
        timeoutMs: 10000,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load subjects");
      return json.data;
    },
    enabled: divisionIds.length > 0,
    staleTime: 120_000,
  });

  // Deduplicate subjects
  const uniqueSubjects: UniqueSubject[] = useMemo(() => {
    if (!subjectsData?.subjects) return [];
    const map = new Map<number, UniqueSubject>();
    (subjectsData.subjects as any[]).forEach((s: any) => {
      if (map.has(s.id)) {
        const existing = map.get(s.id)!;
        if (s.divisionName && !existing.divisionNames.includes(s.divisionName)) {
          existing.divisionNames.push(s.divisionName);
        }
      } else {
        map.set(s.id, {
          subjectId: s.id,
          name: s.name,
          code: s.code || "",
          shortCode: s.shortCode || "",
          subjectType: s.subjectType || "theory",
          credit: s.credit || 0,
          semester: s.semester || 0,
          divisionNames: s.divisionName ? [s.divisionName] : [],
        });
      }
    });
    return Array.from(map.values());
  }, [subjectsData]);

  // Hydrate from saved
  useEffect(() => {
    if (savedSubjects.length > 0) {
      const map = new Map<number, number>();
      savedSubjects.forEach((s) => map.set(s.subjectId, s.durationMinutes));
      setSelectedSubjects(map);
    }
  }, [savedSubjects]);

  const toggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) => {
      const next = new Map(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.set(subjectId, 60);
      }
      return next;
    });
  };

  const setDuration = (subjectId: number, minutes: number) => {
    setSelectedSubjects((prev) => {
      const next = new Map(prev);
      next.set(subjectId, minutes);
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedSubjects.size === 0) {
      toast.warning("Select at least one subject");
      return;
    }
    onSaving();
    try {
      const payload = {
        subjects: Array.from(selectedSubjects.entries()).map(([subjectId, durationMinutes]) => ({
          subjectId,
          durationMinutes,
        })),
      };
      await saveMutation.mutateAsync(payload);
      onSaved();
      toast.success("Subjects saved");
    } catch (err) {
      onError();
      toast.danger("Failed to save", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (scopes.length === 0) {
    return (
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm p-8 text-center">
        <p className="text-default-500 text-sm">Complete Step 2 (Target Scope) first.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm p-6">
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  const totalHours = Array.from(selectedSubjects.values()).reduce((sum, d) => sum + d, 0) / 60;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Subject Grid */}
      <div className="lg:col-span-3">
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider/20 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Subject Selection</h2>
              <p className="text-sm text-default-500 mt-0.5">Select subjects and set exam duration for each.</p>
            </div>
            <Chip variant="tertiary" color="accent" size="sm">
              {uniqueSubjects.length} available
            </Chip>
          </div>

          <div className="divide-y divide-divider/15">
            {uniqueSubjects.map((sub) => {
              const isSelected = selectedSubjects.has(sub.subjectId);
              return (
                <div
                  key={sub.subjectId}
                  className={`flex items-center gap-4 px-6 py-3.5 transition-all duration-150 ${
                    isSelected ? "bg-accent/5" : "hover:bg-default-50"
                  }`}
                >
                  <Checkbox
                    isSelected={isSelected}
                    onChange={() => toggleSubject(sub.subjectId)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
                      <Chip size="sm" variant="tertiary" color="default" className="text-[10px]">
                        {sub.code}
                      </Chip>
                      <Chip size="sm" variant="tertiary" color={sub.subjectType === "theory" ? "accent" : sub.subjectType === "practical" ? "success" : "warning"} className="text-[10px]">
                        {sub.subjectType}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-default-400">Credit: {sub.credit}</span>
                      <span className="text-xs text-default-300">•</span>
                      <span className="text-xs text-default-400">Sem {sub.semester}</span>
                      {sub.divisionNames.length > 0 && (
                        <>
                          <span className="text-xs text-default-300">•</span>
                          <div className="flex gap-1">
                            {sub.divisionNames.slice(0, 3).map((d) => (
                              <Chip key={d} size="sm" variant="tertiary" className="text-[10px]">{d}</Chip>
                            ))}
                            {sub.divisionNames.length > 3 && (
                              <Chip size="sm" variant="tertiary" className="text-[10px]">
                                +{sub.divisionNames.length - 3}
                              </Chip>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Duration select */}
                  {isSelected && (
                    <Select
                      aria-label="Duration"
                      placeholder="Duration"
                      variant="secondary"
                      selectedKey={String(selectedSubjects.get(sub.subjectId) || 60)}
                      onSelectionChange={(key) => setDuration(sub.subjectId, parseInt(String(key)))}
                      className="w-32 shrink-0"
                    >
                      <Select.Trigger className="h-8 text-xs">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {DURATION_OPTIONS.map((opt) => (
                            <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                              {opt.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                </div>
              );
            })}

            {uniqueSubjects.length === 0 && (
              <div className="p-8 text-center text-default-400 text-sm">
                No subjects found for the selected divisions.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Summary sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 flex flex-col gap-4">
          <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-divider/20">
              <h3 className="text-sm font-semibold text-foreground">Subject Summary</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-xl bg-accent/10 text-accent">
                  <BookOpen className="size-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{selectedSubjects.size}</p>
                  <p className="text-xs text-default-500">Selected Subjects</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-xl bg-default-100 text-default-500">
                  <Clock className="size-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-default-500">Total Exam Hours</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-xl bg-default-100 text-default-500">
                  <BookOpen className="size-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{uniqueSubjects.length - selectedSubjects.size}</p>
                  <p className="text-xs text-default-500">Remaining</p>
                </div>
              </div>
            </div>
          </Card>

          <Button
            fullWidth
            onPress={handleSave}
            isPending={saveMutation.isPending}
            isDisabled={selectedSubjects.size === 0}
          >
            {({ isPending: p }) => (
              <>
                {p && <Spinner color="current" size="sm" />}
                <Save className="size-4" />
                Save Subjects
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
