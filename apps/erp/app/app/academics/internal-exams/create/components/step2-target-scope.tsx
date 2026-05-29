"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Spinner,
  Skeleton,
  toast,
} from "@heroui/react";
import { Save, Users, Layers, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";
import { useSaveStepMutation, type ExamScope } from "@/app/lib/queries/exam-wizard";

interface Step2Props {
  examId: number;
  scopes: ExamScope[];
  onSaved: () => void;
  onSaving: () => void;
  onError: () => void;
}

interface DivisionRow {
  id: number;
  displayName: string;
  semesterNo: number;
  batchYear: number;
  specialization: string;
  studentCount: number;
  yearLabel: number;
}

const YEAR_NAMES: Record<number, string> = {
  1: "First Year",
  2: "Second Year",
  3: "Third Year",
  4: "Fourth Year",
  5: "Fifth Year",
  6: "Sixth Year",
};

export function Step2TargetScope({ examId, scopes, onSaved, onSaving, onError }: Step2Props) {
  const [selectedDivIds, setSelectedDivIds] = useState<Set<number>>(new Set());
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());

  const saveMutation = useSaveStepMutation(examId, "scope");

  // Fetch all active divisions
  const { data: divisionsData, isLoading } = useQuery({
    queryKey: ["divisions-all-for-exam"],
    queryFn: async () => {
      const res = await fetchWithTimeout("/api/admin/divisions?limit=500", {
        credentials: "include",
        cache: "no-store",
        timeoutMs: 8000,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load");
      return json.data as { divisions: any[] };
    },
    staleTime: 120_000,
  });

  const divisions: DivisionRow[] = useMemo(() => {
    if (!divisionsData?.divisions) return [];
    return divisionsData.divisions.map((d: any) => ({
      id: d.id,
      displayName: d.displayName,
      semesterNo: d.semesterNo,
      batchYear: d.batchYear,
      specialization: d.specialization || "",
      studentCount: d.studentCount || 0,
      yearLabel: Math.ceil(d.semesterNo / 2),
    }));
  }, [divisionsData]);

  // Get unique years
  const uniqueYears = useMemo(() => {
    const years = [...new Set(divisions.map((d) => d.yearLabel))].sort();
    return years;
  }, [divisions]);

  // Group divisions by year
  const divisionsByYear = useMemo(() => {
    const grouped: Record<number, DivisionRow[]> = {};
    divisions.forEach((d) => {
      if (!grouped[d.yearLabel]) grouped[d.yearLabel] = [];
      grouped[d.yearLabel].push(d);
    });
    return grouped;
  }, [divisions]);

  // Hydrate from saved scopes
  useEffect(() => {
    if (scopes.length > 0) {
      const ids = new Set(scopes.map((s) => s.divisionId));
      const years = new Set(scopes.map((s) => s.yearLabel));
      setSelectedDivIds(ids);
      setSelectedYears(years);
    }
  }, [scopes]);

  // When year filter changes, auto-select/deselect all divisions in that year
  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      const next = new Set(prev);
      const divsInYear = divisionsByYear[year] || [];
      if (next.has(year)) {
        next.delete(year);
        setSelectedDivIds((p) => {
          const n = new Set(p);
          divsInYear.forEach((d) => n.delete(d.id));
          return n;
        });
      } else {
        next.add(year);
        setSelectedDivIds((p) => {
          const n = new Set(p);
          divsInYear.forEach((d) => n.add(d.id));
          return n;
        });
      }
      return next;
    });
  };

  const toggleDiv = (divId: number) => {
    setSelectedDivIds((prev) => {
      const next = new Set(prev);
      if (next.has(divId)) next.delete(divId);
      else next.add(divId);
      return next;
    });
  };

  // Computed summary
  const summary = useMemo(() => {
    const selectedDivs = divisions.filter((d) => selectedDivIds.has(d.id));
    return {
      totalStudents: selectedDivs.reduce((sum, d) => sum + d.studentCount, 0),
      divisionCount: selectedDivs.length,
      years: [...new Set(selectedDivs.map((d) => d.yearLabel))].sort(),
    };
  }, [divisions, selectedDivIds]);

  const handleSave = async () => {
    if (selectedDivIds.size === 0) {
      toast.warning("Select at least one division");
      return;
    }
    onSaving();
    try {
      await saveMutation.mutateAsync({ divisionIds: [...selectedDivIds] });
      onSaved();
      toast.success("Target scope saved");
    } catch (err) {
      onError();
      toast.danger("Failed to save scope", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm p-6">
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Main Content — 3 cols */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        {/* Year Filter Chips */}
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider/20">
            <h2 className="text-lg font-semibold text-foreground">Target Scope</h2>
            <p className="text-sm text-default-500 mt-0.5">Select which years and divisions this exam covers.</p>
          </div>

          <div className="px-6 py-4">
            <p className="text-xs font-medium text-default-500 uppercase tracking-wider mb-3">Year Filters</p>
            <div className="flex flex-wrap gap-2">
              {uniqueYears.map((y) => (
                <button key={y} onClick={() => toggleYear(y)} className="cursor-pointer transition-all duration-150 hover:scale-105">
                  <Chip
                    variant={selectedYears.has(y) ? "primary" : "secondary"}
                    color={selectedYears.has(y) ? "accent" : "default"}
                  >
                    {YEAR_NAMES[y] || `Year ${y}`}
                  </Chip>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Division Selection by Year */}
        {uniqueYears.map((year) => {
          const divsInYear = divisionsByYear[year] || [];
          if (divsInYear.length === 0) return null;

          return (
            <Card key={year} className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b border-divider/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {YEAR_NAMES[year] || `Year ${year}`}
                </h3>
                <Chip size="sm" variant="soft" color={selectedYears.has(year) ? "accent" : "default"}>
                  {divsInYear.filter((d) => selectedDivIds.has(d.id)).length} / {divsInYear.length} selected
                </Chip>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {divsInYear.map((div) => (
                  <div
                    key={div.id}
                    onClick={() => toggleDiv(div.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                      selectedDivIds.has(div.id)
                        ? "border-accent/40 bg-accent/5 shadow-sm"
                        : "border-divider/20 bg-transparent hover:bg-default-50"
                    }`}
                  >
                    <Checkbox
                      isSelected={selectedDivIds.has(div.id)}
                      onChange={() => toggleDiv(div.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{div.displayName}</p>
                      <p className="text-xs text-default-400">Sem {div.semesterNo} • {div.studentCount} students</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sticky Summary Panel — 1 col */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 flex flex-col gap-4">
          <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-divider/20">
              <h3 className="text-sm font-semibold text-foreground">Selection Summary</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-xl bg-accent/10 text-accent">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{summary.totalStudents}</p>
                  <p className="text-xs text-default-500">Target Students</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-xl bg-default-100 text-default-500">
                  <Layers className="size-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{summary.divisionCount}</p>
                  <p className="text-xs text-default-500">Selected Divisions</p>
                </div>
              </div>
              {summary.years.length > 0 && (
                <div className="pt-3 border-t border-divider/20">
                  <p className="text-xs text-default-500 mb-2">Years Included</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.years.map((y) => (
                      <Chip key={y} size="sm" variant="soft" color="accent">
                        {YEAR_NAMES[y] || `Year ${y}`}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Button
            fullWidth
            onPress={handleSave}
            isPending={saveMutation.isPending}
            isDisabled={selectedDivIds.size === 0}
          >
            {({ isPending: p }) => (
              <>
                {p && <Spinner color="current" size="sm" />}
                <Save className="size-4" />
                Save Scope
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
