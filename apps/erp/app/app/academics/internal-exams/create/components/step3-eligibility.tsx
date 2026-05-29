"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Switch,
  Spinner,
  toast,
} from "@heroui/react";
import { Save, ShieldCheck, Calendar, Users } from "lucide-react";
import { useSaveStepMutation, type ExamScope, type ExamEligibilityRule } from "@/app/lib/queries/exam-wizard";

interface Step3Props {
  examId: number;
  scopes: ExamScope[];
  rules: ExamEligibilityRule[];
  onSaved: () => void;
  onSaving: () => void;
  onError: () => void;
}

const YEAR_NAMES: Record<number, string> = {
  1: "First Year", 2: "Second Year", 3: "Third Year",
  4: "Fourth Year", 5: "Fifth Year", 6: "Sixth Year",
};

interface RuleFormState {
  yearLabel: number;
  minAttendancePercent: number;
  allowApprovalOverride: boolean;
  approvalDeadline: string;
}

export function Step3Eligibility({ examId, scopes, rules, onSaved, onSaving, onError }: Step3Props) {
  const uniqueYears = useMemo(
    () => [...new Set(scopes.map((s) => s.yearLabel))].sort(),
    [scopes]
  );

  const [formRules, setFormRules] = useState<RuleFormState[]>([]);
  const saveMutation = useSaveStepMutation(examId, "eligibility");

  // Initialize rules from saved data or defaults
  useEffect(() => {
    const ruleMap = new Map(rules.map((r) => [r.yearLabel, r]));
    const initial = uniqueYears.map((y) => {
      const existing = ruleMap.get(y);
      return {
        yearLabel: y,
        minAttendancePercent: existing?.minAttendancePercent ?? 75,
        allowApprovalOverride: existing?.allowApprovalOverride ?? false,
        approvalDeadline: existing?.approvalDeadline ?? "",
      };
    });
    setFormRules(initial);
  }, [uniqueYears, rules]);

  const updateRule = (yearLabel: number, field: string, value: any) => {
    setFormRules((prev) =>
      prev.map((r) => (r.yearLabel === yearLabel ? { ...r, [field]: value } : r))
    );
  };

  // Computed summary
  const studentsPerYear = useMemo(() => {
    const map: Record<number, number> = {};
    scopes.forEach((s) => {
      map[s.yearLabel] = (map[s.yearLabel] || 0) + s.studentCount;
    });
    return map;
  }, [scopes]);

  const handleSave = async () => {
    onSaving();
    try {
      await saveMutation.mutateAsync({
        rules: formRules.map((r) => ({
          yearLabel: r.yearLabel,
          minAttendancePercent: r.minAttendancePercent,
          allowApprovalOverride: r.allowApprovalOverride,
          approvalDeadline: r.approvalDeadline || undefined,
        })),
      });
      onSaved();
      toast.success("Eligibility rules saved");
    } catch (err) {
      onError();
      toast.danger("Failed to save", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (uniqueYears.length === 0) {
    return (
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm p-8 text-center">
        <p className="text-default-500 text-sm">Complete Step 2 (Target Scope) first to define eligibility rules per year.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-divider/20">
          <h2 className="text-lg font-semibold text-foreground">Eligibility Rules</h2>
          <p className="text-sm text-default-500 mt-0.5">
            Configure attendance requirements and approval overrides per year.
          </p>
        </div>
      </Card>

      {/* Per-year rule cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formRules.map((rule) => (
          <Card
            key={rule.yearLabel}
            className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            {/* Year Header */}
            <div className="px-5 py-3 border-b border-divider/20 flex items-center justify-between bg-default-50/50">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-accent/10 text-accent">
                  <ShieldCheck className="size-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {YEAR_NAMES[rule.yearLabel] || `Year ${rule.yearLabel}`}
                </h3>
              </div>
              <span className="text-xs text-default-400 flex items-center gap-1">
                <Users className="size-3" />
                {studentsPerYear[rule.yearLabel] || 0} students
              </span>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Minimum Attendance */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-default-600">Minimum Attendance %</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={rule.minAttendancePercent}
                    onChange={(e) =>
                      updateRule(rule.yearLabel, "minAttendancePercent", parseInt(e.target.value))
                    }
                    className="flex-1 h-2 rounded-full appearance-none bg-default-200 accent-accent"
                  />
                  <span className="text-sm font-bold text-foreground min-w-[3ch] text-right">
                    {rule.minAttendancePercent}%
                  </span>
                </div>
              </div>

              {/* Approval Override Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Allow Approval Override</p>
                  <p className="text-xs text-default-400">Let HOD override for specific students</p>
                </div>
                <Switch
                  isSelected={rule.allowApprovalOverride}
                  onChange={(checked: boolean) =>
                    updateRule(rule.yearLabel, "allowApprovalOverride", checked)
                  }
                />
              </div>

              {/* Approval Deadline */}
              {rule.allowApprovalOverride && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-default-600 flex items-center gap-1">
                    <Calendar className="size-3" />
                    Approval Deadline
                  </label>
                  <input
                    type="date"
                    value={rule.approvalDeadline}
                    onChange={(e) => updateRule(rule.yearLabel, "approvalDeadline", e.target.value)}
                    className="px-3 py-2 rounded-xl border border-divider/30 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onPress={handleSave} isPending={saveMutation.isPending}>
          {({ isPending: p }) => (
            <>
              {p && <Spinner color="current" size="sm" />}
              <Save className="size-4" />
              Save Eligibility Rules
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
