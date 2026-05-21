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
  toast,
  type Selection,
} from "@heroui/react";
import { ArrowLeft, FileArrowUp } from "@gravity-ui/icons";
import {
  useCounselorDivisionDetailQuery,
  useCounselorStudentVerificationMutation,
  useCounselorBulkPasswordEmailMutation,
  useCounselorEmailJobProgressQuery,
  useCounselorUploadStudentsMutation,
  useCounselorSinglePasswordEmailMutation,
  useCounselorNextStudentIdQuery,
  useCounselorStudentProfileMutation,
} from "@/app/lib/queries/counselor";
import type { DivisionStudent } from "@/app/lib/queries/divisions";
import { StudentActionsMenu } from "./student-actions-menu";
import { EditStudentModal } from "@/components/edit-student-modal";

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

// ─── CSV Parsing ──────────────────────────────────────────────────────────────
function parseCsvText(text: string): Array<{ id: string; name: string; email: string }> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

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

export default function CounselorDivisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const divisionId = parseInt(id, 10);

  const { data: division, isLoading, isError, error } =
    useCounselorDivisionDetailQuery(divisionId);

  const { data: nextIdData } = useCounselorNextStudentIdQuery(
    division?.batchYear ?? 0
  );

  const uploadMutation = useCounselorUploadStudentsMutation(divisionId);
  const singleEmailMutation = useCounselorSinglePasswordEmailMutation(divisionId);
  const bulkEmailMutation = useCounselorBulkPasswordEmailMutation(divisionId);
  const verifyStudentMutation = useCounselorStudentVerificationMutation();
  const studentProfileMutation = useCounselorStudentProfileMutation();

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
    return localStorage.getItem(`division-email-job:${divisionId}`);
  });
  const { data: emailJobProgress } = useCounselorEmailJobProgressQuery(emailJobId);

  const handleClearEmailJob = useCallback(() => {
    setEmailJobId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`division-email-job:${divisionId}`);
    }
  }, [divisionId]);

  // ── CSV validation ─────────────────────────────────────────
  const validateCsvRows = useCallback(
    (rows: Array<{ id: string; name: string; email: string }>, existingStudents: DivisionStudent[]) => {
      const existingIds = new Set(existingStudents.map((s) => s.studentId));
      const existingEmails = new Set(existingStudents.map((s) => s.email));
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();

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
      e.target.value = "";
    },
    [handleFile]
  );

  const validCount = csvRows?.filter((r) => r.status === "valid").length ?? 0;
  const errorCount = csvRows?.filter((r) => r.status === "error").length ?? 0;

  useEffect(() => {
    if (!emailJobId) return;
    localStorage.setItem(`division-email-job:${divisionId}`, emailJobId);
  }, [divisionId, emailJobId]);

  const students = useMemo(() => division?.students ?? [], [division?.students]);
  const selectedCount = useMemo(() => {
    if (selectedStudentIds === "all") return students.length;
    return selectedStudentIds.size;
  }, [selectedStudentIds, students.length]);

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
        description: `${result.inserted} student${result.inserted !== 1 ? "s" : ""} added successfully`,
      });

      setCsvRows(null);
    } catch (err) {
      toast.danger("Upload failed", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 bg-default/10 rounded-lg" />
        <div className="h-40 bg-default/10 rounded-2xl" />
        <div className="h-64 bg-default/10 rounded-2xl" />
      </div>
    );
  }

  if (isError || !division) {
    return (
      <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
        <Card.Content className="flex flex-col items-center gap-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold mb-2">Access Denied or Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "You might not have permission to manage this division."}
          </p>
          <Button variant="secondary" onPress={() => router.push("/app/counselor/divisions")}>
            Back to My Divisions
          </Button>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => router.push("/app/counselor/divisions")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to My Divisions
      </button>

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
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {division.studentCount}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Students
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Tabs>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Division management options">
            <Tabs.Tab id="students">
              Students List
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="upload">
              Bulk CSV Upload
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="students">
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

            {division.students.length === 0 ? (
              <Card className="border border-divider p-12 text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  No students in this division yet. Use the upload tab to add them.
                </p>
              </Card>
            ) : (
              <Table>
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label="Division students list"
                    selectedKeys={selectedStudentIds}
                    selectionMode="multiple"
                    onSelectionChange={setSelectedStudentIds}
                    onRowAction={(key) =>
                      router.push(
                        `/app/counselor/divisions/${divisionId}/students/${Number(key)}`
                      )
                    }
                  >
                    <Table.Header>
                      <Table.Column className="w-[44px]">
                        <Checkbox aria-label="Select all students" slot="selection">
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>
                      </Table.Column>
                      <Table.Column isRowHeader>Student ID</Table.Column>
                      <Table.Column>Name</Table.Column>
                      <Table.Column>Email</Table.Column>
                      <Table.Column>Status</Table.Column>
                      <Table.Column className="w-[56px]">Actions</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {division.students.map((s) => (
                        <Table.Row key={s.id} id={s.id}>
                          <Table.Cell>
                            <Checkbox
                              aria-label={`Select ${s.fullName}`}
                              slot="selection"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                            </Checkbox>
                          </Table.Cell>
                          <Table.Cell className="font-mono text-xs font-medium text-accent">
                            {s.studentId}
                          </Table.Cell>
                          <Table.Cell className="font-medium">{s.fullName}</Table.Cell>
                          <Table.Cell className="text-muted-foreground">{s.email}</Table.Cell>
                          <Table.Cell>
                            <Chip
                              size="sm"
                              variant="soft"
                              color={profileStatus(s.status).color}
                            >
                              {profileStatus(s.status).label}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell>
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
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="upload">
          <div className="flex flex-col gap-5 mt-4">
            {nextIdData && (
              <Card className="border border-accent/20 bg-accent/5">
                <Card.Content className="p-4 flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center font-bold text-accent">#</div>
                  <div>
                    <p className="text-sm font-medium">Next Student ID: <span className="font-mono text-accent">{nextIdData.nextFormatted}</span></p>
                    <p className="text-xs text-muted-foreground">Starting sequence for batch {division.batchYear}</p>
                  </div>
                </Card.Content>
              </Card>
            )}

            <div
              className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                isDragging ? "border-accent bg-accent/5" : "border-divider"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              <FileArrowUp className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Click or drag CSV here</p>
              <p className="text-xs text-muted-foreground mt-1">id, name, email columns required</p>
            </div>

            {csvRows && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Chip color="success" size="sm" variant="soft">{validCount} Valid</Chip>
                  {errorCount > 0 && <Chip color="danger" size="sm" variant="soft">{errorCount} Errors</Chip>}
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="secondary" size="sm" onPress={() => setCsvRows(null)}>Clear</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleConfirmUpload}
                    isDisabled={validCount === 0 || uploadMutation.isPending}
                    isPending={uploadMutation.isPending}
                  >
                    Confirm Upload
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
