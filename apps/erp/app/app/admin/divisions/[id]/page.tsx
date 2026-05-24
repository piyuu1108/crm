"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  Chip,
  Checkbox,
  Table,
  Tabs,
  Spinner,
  toast,
  type Selection,
} from "@heroui/react";
import { ArrowLeft, FileArrowUp } from "@gravity-ui/icons";
import {
  useDivisionDetailQuery,
  useAdminStudentVerificationMutation,
  useBulkPasswordEmailMutation,
  useAdminEmailJobProgressQuery,
  useNextStudentIdQuery,
  useSinglePasswordEmailMutation,
  useUploadStudentsMutation,
  useAdminStudentProfileMutation,
  type DivisionStudent,
} from "@/app/lib/queries/divisions";
import { StudentActionsMenu } from "./student-actions-menu";
import { EditStudentModal } from "@/components/edit-student-modal";
import { DataTable, type TableColumnDef } from "@/components/data-table";

const COLUMNS: TableColumnDef[] = [
  { uid: "studentId", name: "Student ID", allowsSorting: true, isRowHeader: true, className: "w-[160px]" },
  { uid: "fullName", name: "Name", allowsSorting: true },
  { uid: "email", name: "Email", allowsSorting: true },
  { uid: "status", name: "Profile Status", allowsSorting: true, className: "w-[130px]" },
  { uid: "actions", name: "Actions", className: "w-[56px]" },
];

const INITIAL_VISIBLE_COLUMNS = ["studentId", "fullName", "email", "status", "actions"];

// ─── Specialization badge colors ──────────────────────────────────────────────
const SPEC_COLOR: Record<string, "accent" | "success" | "warning"> = {
  AI: "accent",
  DS: "success",
  REGULAR: "warning",
};

// ─── CSV Row after parsing ────────────────────────────────────────────────────
interface CsvRow {
  id: string;
  name: string;
  email: string;
  status: "valid" | "error";
  reason?: string;
}

interface MenuAction {
  id: string;
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
}

// ─── Profile status helper ────────────────────────────────────────────────────
function profileStatus(
  status: string
): { label: string; color: "success" | "warning" | "danger" | "default" } {
  if (status === "approved" || status === "active") {
    return { label: "Approved", color: "success" };
  }
  if (status === "rejected") {
    return { label: "Rejected", color: "danger" };
  }
  if (status === "pending") {
    return { label: "Pending Review", color: "warning" };
  }
  if (status === "incomplete") {
    return { label: "Incomplete", color: "default" };
  }
  return { label: status, color: "default" };
}

// ─── Semester display helper ──────────────────────────────────────────────────
function semesterLabel(semNo: number): string {
  if (semNo <= 2) return "FY";
  if (semNo <= 4) return "SY";
  return "TY";
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 rounded-lg bg-default/10 animate-pulse" />
      <div className="h-40 rounded-2xl border border-divider bg-default/10 animate-pulse" />
      <div className="h-64 rounded-2xl border border-divider bg-default/10 animate-pulse" />
    </div>
  );
}

// ─── CSV Parsing (native FileReader — no papaparse dep needed) ────────────────
function parseCsvText(text: string): Array<{ id: string; name: string; email: string }> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf("id");
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");

  if (idIdx === -1 || nameIdx === -1 || emailIdx === -1) return [];

  return lines.slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        id: cols[idIdx] || "",
        name: cols[nameIdx] || "",
        email: cols[emailIdx] || "",
      };
    });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DivisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const divisionId = parseInt(id, 10);

  const { data: division, isLoading, isError, error } =
    useDivisionDetailQuery(divisionId);

  const { data: nextIdData } = useNextStudentIdQuery(
    division?.batchYear ?? 0
  );

  const uploadMutation = useUploadStudentsMutation(divisionId);
  const singleEmailMutation = useSinglePasswordEmailMutation(divisionId);
  const bulkEmailMutation = useBulkPasswordEmailMutation(divisionId);
  const verifyStudentMutation = useAdminStudentVerificationMutation();
  const studentProfileMutation = useAdminStudentProfileMutation();

  const [editingStudent, setEditingStudent] = useState<DivisionStudent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditSave = useCallback(async (fullName: string, email: string) => {
    if (!editingStudent) return;
    await studentProfileMutation.mutateAsync({
      studentDbId: editingStudent.id,
      payload: { fullName, email },
    });
  }, [editingStudent, studentProfileMutation]);

  // CSV state
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Selection>(new Set());
  const [emailJobId, setEmailJobId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`division-email-job:admin:${divisionId}`);
  });
  const { data: emailJobProgress } = useAdminEmailJobProgressQuery(emailJobId);

  const handleClearEmailJob = useCallback(() => {
    setEmailJobId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`division-email-job:admin:${divisionId}`);
    }
  }, [divisionId]);

  // ── CSV validation ─────────────────────────────────────────
  const validateCsvRows = useCallback(
    (rows: Array<{ id: string; name: string; email: string }>, existingStudents: DivisionStudent[]) => {
      const existingIds = new Set(existingStudents.map((s) => s.studentId));
      const existingEmails = new Set(existingStudents.map((s) => s.email));
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();

      // Student ID format: YY + COURSE_CODE + SPECIALIZATION_CODE + SEQUENCE_NUMBER
      // e.g., 26BCAAI001
      const idPattern = /^\d{2}[A-Z]{3,}[A-Z0-9]*\d{3,}$/;

      return rows.map((row): CsvRow => {
        if (!row.id || !row.name || !row.email) {
          return { ...row, status: "error", reason: "Missing required field" };
        }

        if (!idPattern.test(row.id)) {
          return { ...row, status: "error", reason: "Malformed student ID format" };
        }

        if (existingIds.has(row.id) || seenIds.has(row.id)) {
          return { ...row, status: "error", reason: "Duplicate student ID" };
        }

        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(row.email)) {
          return { ...row, status: "error", reason: "Invalid email format" };
        }

        if (existingEmails.has(row.email) || seenEmails.has(row.email)) {
          return { ...row, status: "error", reason: "Duplicate email" };
        }

        seenIds.add(row.id);
        seenEmails.add(row.email);
        return { ...row, status: "valid" };
      });
    },
    []
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        toast.danger("Invalid file", { description: "Please upload a .csv file" });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseCsvText(text);

        if (parsed.length === 0) {
          toast.danger("Invalid CSV", {
            description: "Could not parse CSV. Ensure columns: id, name, email",
          });
          return;
        }

        const validated = validateCsvRows(parsed, division?.students ?? []);
        setCsvRows(validated);
      };
      reader.readAsText(file);
    },
    [division?.students, validateCsvRows]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input for re-upload of same file
      e.target.value = "";
    },
    [handleFile]
  );

  const validCount = csvRows?.filter((r) => r.status === "valid").length ?? 0;
  const errorCount = csvRows?.filter((r) => r.status === "error").length ?? 0;

  useEffect(() => {
    if (!emailJobId) return;
    localStorage.setItem(`division-email-job:admin:${divisionId}`, emailJobId);
  }, [divisionId, emailJobId]);

  const students = useMemo(() => division?.students ?? [], [division?.students]);
  const selectedCount = useMemo(() => {
    if (selectedStudentIds === "all") return students.length;
    return selectedStudentIds.size;
  }, [selectedStudentIds, students.length]);

  const handleSingleSend = useCallback(
    async (studentDbId: number, fullName: string) => {
      try {
        await singleEmailMutation.mutateAsync(studentDbId);
        toast.success("Password email sent", { description: `${fullName} has been notified.` });
      } catch (error) {
        toast.danger("Failed to send email", {
          description: error instanceof Error ? error.message : "Please try again",
        });
      }
    },
    [singleEmailMutation]
  );

  const handleBulkSend = useCallback(async () => {
    if (selectedCount === 0) return;
    try {
      const ids =
        selectedStudentIds === "all"
          ? students.map((s) => s.id)
          : Array.from(selectedStudentIds).map((id) => Number(id));

      const payload = await bulkEmailMutation.mutateAsync(ids);
      setEmailJobId(payload.jobId);
      toast.success("Emails are being sent in background");
    } catch (error) {
      toast.danger("Failed to queue bulk send", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  }, [bulkEmailMutation, selectedCount, selectedStudentIds, students]);

  const handleReviewAction = useCallback(
    async (
      studentDbId: number,
      fullName: string,
      action: "approve" | "reject"
    ) => {
      try {
        await verifyStudentMutation.mutateAsync({ studentDbId, action });
        toast.success(
          action === "approve" ? "Profile approved" : "Profile rejected",
          {
            description: `${fullName} has been marked as ${action}.`,
          }
        );
      } catch (error) {
        toast.danger("Failed to update verification", {
          description: error instanceof Error ? error.message : "Please try again",
        });
      }
    },
    [verifyStudentMutation]
  );

  const renderCell = useCallback((s: DivisionStudent, columnKey: string) => {
    const ps = profileStatus(s.status);
    switch (columnKey) {
      case "studentId":
        return (
          <span className="font-mono text-xs font-medium text-accent">
            {s.studentId || "—"}
          </span>
        );
      case "fullName":
        return (
          <span className="text-sm font-medium text-foreground">
            {s.fullName}
          </span>
        );
      case "email":
        return (
          <span className="text-sm text-foreground/80">
            {s.email}
          </span>
        );
      case "status":
        return (
          <Chip
            color={ps.color}
            size="sm"
            variant="soft"
          >
            {ps.label}
          </Chip>
        );
      case "actions":
        return (
          <StudentActionsMenu
            ariaLabel={`Actions for ${s.fullName}`}
            actions={[
              {
                id: `edit-${s.id}`,
                label: "Edit Profile",
                onAction: () => {
                  setEditingStudent(s);
                  setIsEditModalOpen(true);
                },
              },
              {
                id: `send-password-${s.id}`,
                label: "Send Password Email",
                isDisabled: singleEmailMutation.isPending,
                onAction: () => handleSingleSend(s.id, s.fullName),
              },
              {
                id: `approve-${s.id}`,
                label: "Approve Profile",
                isDisabled: verifyStudentMutation.isPending,
                onAction: () =>
                  handleReviewAction(s.id, s.fullName, "approve"),
              },
              {
                id: `reject-${s.id}`,
                label: "Reject Profile",
                isDisabled: verifyStudentMutation.isPending,
                onAction: () =>
                  handleReviewAction(s.id, s.fullName, "reject"),
              },
            ]}
          />
        );
      default:
        return null;
    }
  }, [singleEmailMutation.isPending, verifyStudentMutation.isPending, handleSingleSend, handleReviewAction]);

  const bulkActions = useMemo<MenuAction[]>(
    () => [
      {
        id: "send-password-email",
        label: "Send Password Email",
        onPress: handleBulkSend,
        isDisabled: selectedCount === 0,
      },
    ],
    [handleBulkSend, selectedCount]
  );

  const handleConfirmUpload = async () => {
    if (!csvRows || validCount === 0) return;

    const validRows = csvRows
      .filter((r) => r.status === "valid")
      .map((r) => ({ id: r.id, name: r.name, email: r.email }));

    try {
      const result = await uploadMutation.mutateAsync(validRows);

      toast.success("Students uploaded", {
        description: `${result.inserted} student${result.inserted !== 1 ? "s" : ""} added successfully${result.errors > 0 ? ` (${result.errors} errors)` : ""}`,
      });

      setCsvRows(null);
    } catch (err) {
      toast.danger("Upload failed", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    return (
      <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
        <Card.Content className="flex flex-col items-center gap-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-foreground">
            Failed to load division
          </h2>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
          <Button variant="secondary" onPress={() => router.back()}>
            Go Back
          </Button>
        </Card.Content>
      </Card>
    );
  }

  if (!division) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Back Button ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => router.push("/app/admin/divisions")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to Divisions
      </button>

      {/* ── Division Header ────────────────────────────────────── */}
      <Card className="border border-divider">
        <Card.Content className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold font-mono text-foreground">
                  {division.displayName}
                </h1>
                <Chip
                  color={SPEC_COLOR[division.specialization] || "accent"}
                  size="sm"
                  variant="soft"
                >
                  {division.specialization}
                </Chip>
              </div>
              <p className="text-sm text-muted-foreground">
                {semesterLabel(division.semesterNo)} · Semester{" "}
                {division.semesterNo} · Batch {division.batchYear}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {division.studentCount}
                </p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {division.counselorName || "—"}
                </p>
                <p className="text-xs text-muted-foreground">Counselor</p>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs>
        <Tabs.List>
          <Tabs.Tab id="students">Students ({division.students.length})</Tabs.Tab>
          <Tabs.Tab id="upload">CSV Upload</Tabs.Tab>
        </Tabs.List>

        {/* ── Students Tab ──────────────────────────────────────── */}
        <Tabs.Panel id="students">
          {division.students.length === 0 ? (
            <Card className="border border-divider p-8 text-center mt-4">
              <Card.Content className="flex flex-col items-center gap-3">
                <div className="text-4xl">👨‍🎓</div>
                <p className="text-sm text-muted-foreground">
                  No students in this division yet — use the CSV Upload tab to add students
                </p>
              </Card.Content>
            </Card>
          ) : (
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : "Select students to run bulk actions"}
                </p>
                {selectedCount > 0 && (
                  <StudentActionsMenu
                    variant="secondary"
                    ariaLabel="Bulk student actions"
                    actions={bulkActions.map((action) => ({
                      id: action.id,
                      label: action.label,
                      isDisabled: action.isDisabled || bulkEmailMutation.isPending,
                      onAction: action.onPress,
                    }))}
                  />
                )}
              </div>

              {emailJobProgress && (
                <Card className="mb-4 border border-accent/20 bg-accent/5">
                  <Card.Content className="p-4 text-sm flex flex-col gap-2 relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          Bulk Password Emails Progress
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          Sent: <span className="font-medium text-foreground">{emailJobProgress.sent}</span> / {emailJobProgress.total}
                        </p>
                        <p className="text-muted-foreground">
                          Failed: <span className="font-medium text-danger">{emailJobProgress.failed}</span>
                        </p>
                      </div>
                      {emailJobProgress.status === "completed" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="shrink-0"
                          onPress={handleClearEmailJob}
                        >
                          Remove Progress
                        </Button>
                      )}
                    </div>
                    {emailJobProgress.failedEmails && emailJobProgress.failedEmails.length > 0 && (
                      <div className="mt-2 border-t border-divider pt-2">
                        <p className="font-medium text-danger text-xs mb-1">Failed Recipients:</p>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground flex flex-col gap-0.5">
                          {emailJobProgress.failedEmails.map((email) => (
                            <li key={email}>{email}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card.Content>
                </Card>
              )}

              <DataTable
                data={division.students}
                columns={COLUMNS}
                initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
                searchKeys={["studentId", "fullName", "email"]}
                searchPlaceholder="Search students..."
                renderCell={renderCell}
                localStorageKey={`division_${divisionId}_students_table`}
                selectionMode="multiple"
                selectedKeys={selectedStudentIds}
                onSelectionChange={setSelectedStudentIds}
                onRowAction={(key) =>
                  router.push(`/app/admin/divisions/${divisionId}/students/${Number(key)}`)
                }
              />
            </div>
          )}
        </Tabs.Panel>

        {/* ── CSV Upload Tab ────────────────────────────────────── */}
        <Tabs.Panel id="upload">
          <div className="flex flex-col gap-5 mt-4">
            {/* Next available ID info */}
            {nextIdData && (
              <Card className="border border-accent/20 bg-accent/5">
                <Card.Content className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <span className="text-lg font-bold text-accent">#</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Next available Student ID number:{" "}
                        <span className="font-mono font-bold text-accent">
                          {nextIdData.nextFormatted}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use this as the starting sequence when creating IDs in your CSV
                        (prefix: {nextIdData.yearPrefix})
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            )}

            {/* Drop zone */}
            <div
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                isDragging
                  ? "border-accent bg-accent/5 scale-[1.01]"
                  : "border-divider hover:border-accent/40"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex flex-col items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-xl bg-default/10">
                  <FileArrowUp className="size-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop a CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse • Required columns: id, name, email
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
              </div>
            </div>

            {/* Preview table */}
            {csvRows && csvRows.length > 0 && (
              <div className="flex flex-col gap-4">
                {/* Summary */}
                <div className="flex items-center gap-4">
                  <Chip color="success" size="sm" variant="soft">
                    {validCount} valid
                  </Chip>
                  {errorCount > 0 && (
                    <Chip color="danger" size="sm" variant="soft">
                      {errorCount} error{errorCount !== 1 ? "s" : ""}
                    </Chip>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {csvRows.length} total rows parsed
                  </span>
                </div>

                {/* Preview Table */}
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content
                      aria-label="CSV preview table"
                      className="min-w-[600px]"
                    >
                      <Table.Header>
                        <Table.Column isRowHeader className="w-[160px]">
                          ID
                        </Table.Column>
                        <Table.Column>Name</Table.Column>
                        <Table.Column>Email</Table.Column>
                        <Table.Column className="w-[200px]">
                          Status
                        </Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {csvRows.map((row, idx) => (
                          <Table.Row key={idx} id={idx}>
                            <Table.Cell>
                              <span
                                className={`font-mono text-xs font-medium ${
                                  row.status === "valid"
                                    ? "text-foreground"
                                    : "text-danger"
                                }`}
                              >
                                {row.id || "—"}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-sm text-foreground">
                                {row.name || "—"}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-sm text-foreground/80">
                                {row.email || "—"}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              {row.status === "valid" ? (
                                <Chip color="success" size="sm" variant="soft">
                                  Valid
                                </Chip>
                              ) : (
                                <div className="flex flex-col">
                                  <Chip color="danger" size="sm" variant="soft">
                                    Error
                                  </Chip>
                                  {row.reason && (
                                    <span className="text-[10px] text-danger mt-0.5">
                                      {row.reason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>

                {/* Action buttons */}
                <div className="flex items-center gap-3 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => setCsvRows(null)}
                    isDisabled={uploadMutation.isPending}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onPress={handleConfirmUpload}
                    isDisabled={validCount === 0}
                    isPending={uploadMutation.isPending}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending && <Spinner color="current" size="sm" />}
                        {isPending
                          ? "Uploading…"
                          : `Confirm Upload (${validCount} student${validCount !== 1 ? "s" : ""})`}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>

      <EditStudentModal
        student={editingStudent}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleEditSave}
      />
    </div>
  );
}
