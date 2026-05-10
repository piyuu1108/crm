"use client";

import React, { useState, useCallback } from "react";
import { Button, Switch, Label } from "@heroui/react";
import type { InternalExamMark, StudentInfo, MaxMarks } from "@/app/lib/queries/internal-exams";

interface MarksRow {
  studentId: number;
  studentName: string;
  theoryMarks: string;
  practicalMarks: string;
}

interface MarksEntryTableProps {
  students: StudentInfo[];
  existingMarks: InternalExamMark[];
  subjectType: string;
  maxMarks: MaxMarks;
  subjectName: string;
  divisionName: string;
  isVisible: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
  onSave: (records: {
    studentId: number;
    theoryMarks: number | null;
    practicalMarks: number | null;
    studentName: string;
    subjectName: string;
    divisionName: string;
  }[]) => void;
  isSaving: boolean;
}

export function MarksEntryTable({
  students,
  existingMarks,
  subjectType,
  maxMarks,
  subjectName,
  divisionName,
  isVisible,
  onVisibilityChange,
  onSave,
  isSaving,
}: MarksEntryTableProps) {
  const hasTheory = subjectType === "theory" || subjectType === "both";
  const hasPractical = subjectType === "practical" || subjectType === "both";

  // Helper to format DB marks for UI
  const formatMark = (markStr: string | null | undefined) => {
    if (!markStr) return "";
    const num = parseFloat(markStr);
    if (num === -1) return "AB";
    return num.toString(); // Strips trailing zeros from decimals
  };

  // Initialize rows from existing marks + students list
  const [rows, setRows] = useState<MarksRow[]>(() => {
    return students.map((s) => {
      const existing = existingMarks.find((m) => m.studentId === s.id);
      return {
        studentId: s.id,
        studentName: s.fullName,
        theoryMarks: formatMark(existing?.theoryMarks),
        practicalMarks: formatMark(existing?.practicalMarks),
      };
    });
  });

  const [errors, setErrors] = useState<Record<number, string>>({});

  const updateRow = useCallback((studentId: number, field: "theoryMarks" | "practicalMarks", value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, [field]: value.toUpperCase() } : r))
    );
    // Clear error for this student
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[studentId];
      return copy;
    });
  }, []);

  const validateAndSave = useCallback(() => {
    const newErrors: Record<number, string> = {};

    for (const row of rows) {
      if (hasTheory && row.theoryMarks !== "") {
        const valStr = row.theoryMarks.trim();
        if (valStr !== "AB") {
          const val = parseFloat(valStr);
          if (isNaN(val) || val < 0) {
            newErrors[row.studentId] = "Invalid theory marks";
          } else if (maxMarks.theory !== null && val > maxMarks.theory) {
            newErrors[row.studentId] = `Theory exceeds max (${maxMarks.theory})`;
          }
        }
      }
      if (hasPractical && row.practicalMarks !== "") {
        const valStr = row.practicalMarks.trim();
        if (valStr !== "AB") {
          const val = parseFloat(valStr);
          if (isNaN(val) || val < 0) {
            newErrors[row.studentId] = "Invalid practical marks";
          } else if (maxMarks.practical !== null && val > maxMarks.practical) {
            newErrors[row.studentId] = `Practical exceeds max (${maxMarks.practical})`;
          }
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const parseForSave = (valStr: string) => {
      const cleanStr = valStr.trim();
      if (!cleanStr) return null;
      if (cleanStr === "AB") return -1;
      return parseFloat(cleanStr);
    };

    const records = rows.map((r) => ({
      studentId: r.studentId,
      theoryMarks: hasTheory ? parseForSave(r.theoryMarks) : null,
      practicalMarks: hasPractical ? parseForSave(r.practicalMarks) : null,
      studentName: r.studentName,
      subjectName,
      divisionName,
    }));

    onSave(records);
  }, [rows, hasTheory, hasPractical, maxMarks, subjectName, divisionName, onSave]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Switch
            isSelected={isVisible}
            onChange={(selected) => onVisibilityChange(selected)}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Content>
              <Label className="text-sm">
                {isVisible ? "Visible to Students" : "Hidden from Students"}
              </Label>
            </Switch.Content>
          </Switch>
        </div>
        <Button
          variant="primary"
          onPress={validateAndSave}
          isPending={isSaving}
        >
          Save Marks
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-foreground w-8">#</th>
              <th className="px-4 py-3 text-left font-medium text-foreground min-w-[200px]">Student Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">ID</th>
              {hasTheory && (
                <th className="px-4 py-3 text-center font-medium text-foreground min-w-[120px]">
                  Theory{maxMarks.theory !== null ? ` (Max: ${maxMarks.theory})` : ""}
                </th>
              )}
              {hasPractical && (
                <th className="px-4 py-3 text-center font-medium text-foreground min-w-[120px]">
                  Practical{maxMarks.practical !== null ? ` (Max: ${maxMarks.practical})` : ""}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const student = students.find((s) => s.id === row.studentId);
              const hasError = !!errors[row.studentId];
              return (
                <tr
                  key={row.studentId}
                  className={`border-b border-border last:border-0 transition-colors ${
                    hasError ? "bg-danger/5" : "hover:bg-surface/50"
                  }`}
                >
                  <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{row.studentName}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs font-mono">
                    {student?.studentId || student?.enrollmentId || "-"}
                  </td>
                  {hasTheory && (
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={row.theoryMarks}
                        onChange={(e) => updateRow(row.studentId, "theoryMarks", e.target.value)}
                        className="w-20 px-2 py-1.5 text-center rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        placeholder="—"
                      />
                    </td>
                  )}
                  {hasPractical && (
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={row.practicalMarks}
                        onChange={(e) => updateRow(row.studentId, "practicalMarks", e.target.value)}
                        className="w-20 px-2 py-1.5 text-center rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        placeholder="—"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Error display */}
      {Object.keys(errors).length > 0 && (
        <div className="text-sm text-danger bg-danger/10 rounded-lg px-4 py-3">
          <p className="font-medium mb-1">Validation Errors:</p>
          <ul className="list-disc list-inside">
            {Object.entries(errors).map(([sid, msg]) => {
              const student = rows.find((r) => r.studentId === parseInt(sid));
              return <li key={sid}>{student?.studentName}: {msg}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
