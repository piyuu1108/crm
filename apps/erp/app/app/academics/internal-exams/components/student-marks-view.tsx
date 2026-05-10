"use client";

import React from "react";
import { Card, Spinner, Alert, Chip } from "@heroui/react";
import { useStudentMarksQuery } from "@/app/lib/queries/internal-exams";

export function StudentMarksView() {
  const { data, isLoading, isError, error } = useStudentMarksQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{(error as Error).message}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const marks = data?.marks || [];

  if (marks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Internal Exam Marks</h1>
        <p className="text-sm text-muted-foreground mb-6">Your internal exam marks will appear here once they are released.</p>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No marks are visible yet. Check back later.</p>
        </Card>
      </div>
    );
  }

  // Group by subject
  const subjectGroups: Record<string, typeof marks> = {};
  for (const mark of marks) {
    const key = mark.subjectName;
    if (!subjectGroups[key]) subjectGroups[key] = [];
    subjectGroups[key].push(mark);
  }

  // Sort exams within each group
  for (const key of Object.keys(subjectGroups)) {
    subjectGroups[key].sort((a, b) => a.examNumber - b.examNumber);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Internal Exam Marks</h1>
        <p className="text-sm text-muted-foreground">Your released internal exam marks</p>
      </div>

      {Object.entries(subjectGroups).map(([subjectName, subjectMarks]) => {
        const subjectType = subjectMarks[0]?.subjectType || "theory";
        const hasTheory = subjectType === "theory" || subjectType === "both";
        const hasPractical = subjectType === "practical" || subjectType === "both";

        return (
          <Card key={subjectName} className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-surface/50">
              <h3 className="text-lg font-semibold text-foreground">{subjectName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subjectMarks[0]?.divisionName}</p>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/30">
                    <th className="px-6 py-3 text-left font-medium text-foreground">Exam</th>
                    {hasTheory && (
                      <th className="px-6 py-3 text-center font-medium text-foreground">Theory</th>
                    )}
                    {hasPractical && (
                      <th className="px-6 py-3 text-center font-medium text-foreground">Practical</th>
                    )}
                    <th className="px-6 py-3 text-center font-medium text-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectMarks.map((mark) => {
                    const getNumericValue = (valStr: string | null | undefined) => {
                      if (!valStr) return 0;
                      const num = parseFloat(valStr);
                      return num === -1 ? 0 : num;
                    };
                    const formatDisplay = (valStr: string | null | undefined) => {
                      if (!valStr) return "—";
                      const num = parseFloat(valStr);
                      return num === -1 ? "AB" : num.toString();
                    };

                    const theory = getNumericValue(mark.theoryMarks);
                    const practical = getNumericValue(mark.practicalMarks);
                    const total = theory + practical;
                    const maxTotal = (mark.maxTheory || 0) + (mark.maxPractical || 0);

                    return (
                      <tr key={mark.id} className="border-b border-border last:border-0">
                        <td className="px-6 py-3 font-medium text-foreground">{mark.examName}</td>
                        {hasTheory && (
                          <td className="px-6 py-3 text-center">
                            <span className="font-semibold text-foreground">{formatDisplay(mark.theoryMarks)}</span>
                            <span className="text-muted-foreground text-xs ml-1">/ {mark.maxTheory ?? "—"}</span>
                          </td>
                        )}
                        {hasPractical && (
                          <td className="px-6 py-3 text-center">
                            <span className="font-semibold text-foreground">{formatDisplay(mark.practicalMarks)}</span>
                            <span className="text-muted-foreground text-xs ml-1">/ {mark.maxPractical ?? "—"}</span>
                          </td>
                        )}
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            maxTotal > 0 && total / maxTotal >= 0.6
                              ? "bg-success/10 text-success"
                              : maxTotal > 0 && total / maxTotal >= 0.4
                              ? "bg-warning/10 text-warning"
                              : "bg-danger/10 text-danger"
                          }`}>
                            {total} / {maxTotal || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
