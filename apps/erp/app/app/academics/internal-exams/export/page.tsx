"use client";

import React, { useState } from "react";
import {
  Card,
  Spinner,
  Select,
  ListBox,
  Label,
  Alert,
  Button,
} from "@heroui/react";
import { ArrowLeft, ArrowDownToLine } from "@gravity-ui/icons";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useExportPreviewQuery } from "@/app/lib/queries/internal-exams";

export default function ExportPage() {
  const router = useRouter();
  const { activeRole } = useAuthStore();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(0);

  const { data: assignments = [] } = useQuery({
    queryKey: ["internal-exams-assignments"],
    queryFn: async () => {
      const res = await fetch(`/api/internal-exams/assignments`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    },
  });

  const { data: preview, isLoading, isError, error } = useExportPreviewQuery(
    selectedAssignmentId
  );

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/internal-evaluation/export?assignmentId=${selectedAssignmentId}&download=true`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `internal_marks_${preview?.subjectCode || "export"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!["faculty", "counselor", "hod"].includes(activeRole || "")) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unauthorized</Alert.Title>
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
          <h1 className="text-2xl font-bold text-foreground">Export Internal Marks</h1>
          <p className="text-sm text-muted-foreground">Preview and download CSV for university submission</p>
        </div>
      </div>

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
                  {a.subjectName} — {a.divisionName}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Card>

      {selectedAssignmentId > 0 && (
        isLoading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>{(error as Error).message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : preview ? (
          <>
            {/* Validation summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{preview.totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </Card>
              <Card className={`p-4 text-center ${preview.errors.length === 0 ? "border-success/30" : ""}`}>
                <p className="text-3xl font-bold text-success">{preview.totalCount - new Set(preview.errors.map(e => e.split(":")[0])).size}</p>
                <p className="text-sm text-muted-foreground">Valid Rows</p>
              </Card>
              <Card className={`p-4 text-center ${preview.errors.length > 0 ? "border-danger/30" : ""}`}>
                <p className="text-3xl font-bold text-danger">{new Set(preview.errors.map(e => e.split(":")[0])).size}</p>
                <p className="text-sm text-muted-foreground">Students with Issues</p>
              </Card>
            </div>

            {/* Errors */}
            {preview.errors.length > 0 && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Validation Errors ({preview.errors.length})</Alert.Title>
                  <Alert.Description>
                    <ul className="list-disc list-inside mt-2 max-h-40 overflow-y-auto text-sm">
                      {preview.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {/* Preview table */}
            <Card className="p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">CSV Preview</h3>
                <Button
                  variant="primary"
                  onPress={handleDownload}
                  isDisabled={preview.errors.length > 0}
                  isPending={downloading}
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      {preview.rows.length > 0 &&
                        Object.keys(preview.rows[0]).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-surface/50">
                        {Object.values(row).map((val, ci) => (
                          <td key={ci} className="px-3 py-2 whitespace-nowrap text-foreground">
                            {val !== null && val !== undefined ? String(val) : <span className="text-danger font-bold">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : null
      )}
    </div>
  );
}
