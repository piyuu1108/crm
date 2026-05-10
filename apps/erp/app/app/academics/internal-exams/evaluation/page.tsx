"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  Spinner,
  Select,
  ListBox,
  Label,
  Alert,
  Button,
} from "@heroui/react";
import { ArrowLeft, CircleCheck, Lock } from "@gravity-ui/icons";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  useEvaluationQuery,
  useSaveEvaluationMutation,
  useFinalizeMutation,
  type InternalExamMark,
} from "@/app/lib/queries/internal-exams";

interface EvalRow {
  studentId: number;
  studentName: string;
  studentDisplayId: string;
  examMarks: Record<number, { theory: string | null; practical: string | null }>;
  finalTheory: string;
  finalPractical: string;
}

export default function EvaluationPage() {
  const router = useRouter();
  const { activeRole } = useAuthStore();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(0);

  // Fetch assignments — role-aware endpoint returns flat array
  const { data: assignments = [] } = useQuery({
    queryKey: ["internal-exams-assignments"],
    queryFn: async () => {
      const res = await fetch(`/api/internal-exams/assignments`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    },
  });

  const { data: evalData, isLoading } = useEvaluationQuery(selectedAssignmentId);
  const saveMutation = useSaveEvaluationMutation(selectedAssignmentId);
  const finalizeMutation = useFinalizeMutation(selectedAssignmentId);

  const semesterId = evalData?.semesterId || 0;

  const [rows, setRows] = useState<EvalRow[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Build rows when data loads
  useEffect(() => {
    if (!evalData) return;

    const { students, rawMarks, evaluations, exams } = evalData;

    const formatMark = (markStr: string | null | undefined) => {
      if (!markStr) return "";
      const num = parseFloat(markStr);
      if (num === -1) return "AB";
      return num.toString();
    };

    const builtRows: EvalRow[] = students.map((s) => {
      const existing = evaluations.find((e) => e.studentId === s.id);
      const examMarksMap: Record<number, { theory: string | null; practical: string | null }> = {};

      for (const exam of exams) {
        const mark = rawMarks.find(
          (m) => m.internalExamId === exam.id && m.studentId === s.id
        );
        examMarksMap[exam.id] = {
          theory: mark?.theoryMarks ?? null,
          practical: mark?.practicalMarks ?? null,
        };
      }

      return {
        studentId: s.id,
        studentName: s.fullName,
        studentDisplayId: s.studentId || s.enrollmentId || String(s.id),
        examMarks: examMarksMap,
        finalTheory: formatMark(existing?.finalTheoryMarks),
        finalPractical: formatMark(existing?.finalPracticalMarks),
      };
    });

    setRows(builtRows);
  }, [evalData]);

  const formatDisplay = (valStr: string | null | undefined) => {
    if (!valStr) return "—";
    const num = parseFloat(valStr);
    return num === -1 ? "AB" : num.toString();
  };

  const isFinalized = evalData?.evaluations?.some((e) => e.isFinalized) ?? false;
  const canEdit = !isFinalized || activeRole === "hod";
  const hasTheory = evalData?.assignment?.subjectType === "theory" || evalData?.assignment?.subjectType === "both";
  const hasPractical = evalData?.assignment?.subjectType === "practical" || evalData?.assignment?.subjectType === "both";

  const updateRow = useCallback((studentId: number, field: "finalTheory" | "finalPractical", value: string) => {
    setRows((prev) => prev.map((r) => r.studentId === studentId ? { ...r, [field]: value.toUpperCase() } : r));
  }, []);

  const handleSave = useCallback(() => {
    if (!evalData || !canEdit) return;

    const newErrors: Record<number, string> = {};
    const maxT = evalData.maxMarks.theory;
    const maxP = evalData.maxMarks.practical;

    for (const row of rows) {
      if (hasTheory && row.finalTheory !== "") {
        const valStr = row.finalTheory.trim();
        if (valStr !== "AB") {
          const val = parseFloat(valStr);
          if (isNaN(val) || val < 0) newErrors[row.studentId] = "Invalid theory marks";
          else if (maxT !== null && val > maxT) newErrors[row.studentId] = `Theory exceeds max (${maxT})`;
        }
      }
      if (hasPractical && row.finalPractical !== "") {
        const valStr = row.finalPractical.trim();
        if (valStr !== "AB") {
          const val = parseFloat(valStr);
          if (isNaN(val) || val < 0) newErrors[row.studentId] = "Invalid practical marks";
          else if (maxP !== null && val > maxP) newErrors[row.studentId] = `Practical exceeds max (${maxP})`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const parseForSave = (valStr: string) => {
      const cleanStr = valStr.trim();
      if (!cleanStr) return null;
      if (cleanStr === "AB") return -1;
      return parseFloat(cleanStr);
    };

    saveMutation.mutate({
      assignmentId: selectedAssignmentId,
      semesterId,
      records: rows.map((r) => ({
        studentId: r.studentId,
        finalTheoryMarks: hasTheory ? parseForSave(r.finalTheory) : null,
        finalPracticalMarks: hasPractical ? parseForSave(r.finalPractical) : null,
        studentName: r.studentName,
        subjectName: evalData.assignment.subjectName,
        subjectType: evalData.assignment.subjectType,
        divisionName: evalData.assignment.divisionName,
      })),
    });
  }, [rows, evalData, hasTheory, hasPractical, canEdit, selectedAssignmentId, semesterId, saveMutation]);

  const handleFinalize = useCallback((finalize: boolean) => {
    finalizeMutation.mutate({
      assignmentId: selectedAssignmentId,
      semesterId,
      finalize,
    });
  }, [selectedAssignmentId, semesterId, finalizeMutation]);

  if (!["faculty", "counselor", "hod"].includes(activeRole || "")) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unauthorized</Alert.Title>
            <Alert.Description>You do not have permission to access this page.</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button isIconOnly variant="tertiary" onPress={() => router.push("/app/academics/internal-exams")} aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Internal Evaluation</h1>
          <p className="text-sm text-muted-foreground">Enter final internal marks for university submission</p>
        </div>
      </div>

      {/* Assignment selector */}
      <Card className="p-6">
        <Select
          placeholder="Select subject assignment"
          selectedKey={selectedAssignmentId ? selectedAssignmentId.toString() : ""}
          onSelectionChange={(key) => setSelectedAssignmentId(parseInt(key as string) || 0)}
          className="max-w-md"
        >
          <Label>Subject Assignment</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {assignments.map((a: any) => (
                <ListBox.Item key={a.id.toString()} id={a.id.toString()} textValue={`${a.subjectName} - ${a.divisionName}`}>
                  {a.subjectName} — {a.divisionName} {a.facultyName ? `(${a.facultyName})` : ""}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Card>

      {/* Evaluation table */}
      {selectedAssignmentId > 0 && (
        isLoading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : evalData ? (
          <Card className="p-6">
            {/* Status bar */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {evalData.assignment.subjectName} — {evalData.assignment.divisionName}
                </h3>
                {isFinalized && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success">
                    <Lock className="w-3 h-3" /> Finalized
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Button variant="primary" onPress={handleSave} isPending={saveMutation.isPending}>
                    Save Evaluation
                  </Button>
                )}
                {!isFinalized && (activeRole === "faculty" || activeRole === "hod") && (
                  <Button variant="secondary" onPress={() => handleFinalize(true)} isPending={finalizeMutation.isPending}>
                    <CircleCheck className="w-4 h-4" /> Finalize
                  </Button>
                )}
                {isFinalized && activeRole === "hod" && (
                  <Button variant="tertiary" className="text-warning" onPress={() => handleFinalize(false)} isPending={finalizeMutation.isPending}>
                    Un-finalize (Override)
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="px-3 py-3 text-left font-medium text-foreground w-8">#</th>
                    <th className="px-3 py-3 text-left font-medium text-foreground min-w-[180px]">Student</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs">ID</th>
                    {evalData.exams.map((exam) => (
                      <th key={exam.id} className="px-3 py-3 text-center font-medium text-muted-foreground text-xs min-w-[100px] border-l border-border">
                        {exam.examName}
                        {hasTheory && <div className="text-xs">T</div>}
                        {hasPractical && <div className="text-xs">P</div>}
                      </th>
                    ))}
                    {hasTheory && (
                      <th className="px-3 py-3 text-center font-medium text-accent min-w-[120px] border-l-2 border-accent/30">
                        Final Theory
                        <div className="text-xs text-muted-foreground font-normal">Max: {evalData.maxMarks.theory ?? "—"}</div>
                      </th>
                    )}
                    {hasPractical && (
                      <th className="px-3 py-3 text-center font-medium text-accent min-w-[120px]">
                        Final Practical
                        <div className="text-xs text-muted-foreground font-normal">Max: {evalData.maxMarks.practical ?? "—"}</div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const hasError = !!errors[row.studentId];
                    return (
                      <tr key={row.studentId} className={`border-b border-border last:border-0 ${hasError ? "bg-danger/5" : "hover:bg-surface/50"} transition-colors`}>
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{row.studentName}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs font-mono">{row.studentDisplayId}</td>
                        {evalData.exams.map((exam) => {
                          const em = row.examMarks[exam.id];
                          return (
                            <td key={exam.id} className="px-3 py-2 text-center border-l border-border">
                              {hasTheory && (
                                <div className="text-xs text-muted-foreground">{formatDisplay(em?.theory)}</div>
                              )}
                              {hasPractical && (
                                <div className="text-xs text-muted-foreground">{formatDisplay(em?.practical)}</div>
                              )}
                            </td>
                          );
                        })}
                        {hasTheory && (
                          <td className="px-3 py-2 text-center border-l-2 border-accent/30">
                            <input
                              type="text"
                              value={row.finalTheory}
                              onChange={(e) => updateRow(row.studentId, "finalTheory", e.target.value)}
                              disabled={!canEdit}
                              className="w-20 px-2 py-1.5 text-center rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="—"
                            />
                          </td>
                        )}
                        {hasPractical && (
                          <td className="px-3 py-2 text-center">
                            <input
                              type="text"
                              value={row.finalPractical}
                              onChange={(e) => updateRow(row.studentId, "finalPractical", e.target.value)}
                              disabled={!canEdit}
                              className="w-20 px-2 py-1.5 text-center rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Errors */}
            {Object.keys(errors).length > 0 && (
              <div className="text-sm text-danger bg-danger/10 rounded-lg px-4 py-3 mt-4">
                <p className="font-medium mb-1">Validation Errors:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(errors).map(([sid, msg]) => {
                    const row = rows.find((r) => r.studentId === parseInt(sid));
                    return <li key={sid}>{row?.studentName}: {msg}</li>;
                  })}
                </ul>
              </div>
            )}

            {saveMutation.isSuccess && (
              <Alert status="success" className="mt-4">
                <Alert.Indicator />
                <Alert.Content><Alert.Title>Evaluation marks saved successfully.</Alert.Title></Alert.Content>
              </Alert>
            )}

            {finalizeMutation.isSuccess && (
              <Alert status="success" className="mt-4">
                <Alert.Indicator />
                <Alert.Content><Alert.Title>Finalization status updated.</Alert.Title></Alert.Content>
              </Alert>
            )}
          </Card>
        ) : null
      )}
    </div>
  );
}
