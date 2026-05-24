"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Card,
  useOverlayState,
  toast,
  Tooltip,
} from "@heroui/react";
import { Plus, FileArrowUp, ArrowDownToLine } from "@gravity-ui/icons";
import {
  facultyListKey,
  useFacultyListQuery,
  useFacultyPasswordEmailMutation,
  useFacultyEmailJobProgressQuery,
  type FacultyListParams,
} from "@/app/lib/queries/faculty";
import { AddFacultyDrawer } from "./add-faculty-drawer";
import { FacultyActionsMenu } from "./faculty-actions-menu";
import { EditFacultyModal } from "./edit-faculty-modal";
import { DataTable, type TableColumnDef } from "@/components/data-table";

const STATUS_COLOR: Record<string, "success" | "danger"> = {
  true: "success",
  false: "danger",
};

const COLUMNS: TableColumnDef[] = [
  { uid: "facultyCode", name: "Code", allowsSorting: true, isRowHeader: true, className: "w-[120px]" },
  { uid: "name", name: "Member", allowsSorting: true },
  { uid: "email", name: "Email", className: "min-w-[180px]" },
  { uid: "mobile", name: "Mobile", className: "w-[140px]" },
  { uid: "designation", name: "Designation", className: "min-w-[160px]" },
  { uid: "isActive", name: "Status", className: "w-[100px]" },
  { uid: "assignments", name: "Assignments", allowsSorting: true },
  { uid: "actions", name: "Actions", className: "w-[56px]" },
];

const INITIAL_VISIBLE_COLUMNS = [
  "facultyCode",
  "name",
  "email",
  "mobile",
  "designation",
  "isActive",
  "assignments",
  "actions",
];

export default function FacultyPage() {
  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [emailJobId, setEmailJobId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("faculty-email-job:admin");
  });

  const singleEmailMutation = useFacultyPasswordEmailMutation();
  const { data: emailJobProgress } = useFacultyEmailJobProgressQuery(emailJobId);

  const handleClearEmailJob = useCallback(() => {
    setEmailJobId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("faculty-email-job:admin");
    }
  }, []);

  useEffect(() => {
    if (!emailJobId) return;
    localStorage.setItem("faculty-email-job:admin", emailJobId);
  }, [emailJobId]);

  const params: FacultyListParams = useMemo(
    () => ({
      page: 1,
      limit: 1000,
    }),
    []
  );

  const { data, isLoading, isError, error, refetch } =
    useFacultyListQuery(params);

  const handleRecover = useCallback(() => {
    queryClient.removeQueries({ queryKey: facultyListKey(params) });
    void refetch();
    router.refresh();
  }, [params, queryClient, refetch, router]);

  const handleSingleSend = useCallback(
    async (facultyDbId: number, name: string) => {
      try {
        await singleEmailMutation.mutateAsync(facultyDbId);
        toast.success("Password email sent", {
          description: `${name} has been notified.`,
        });
      } catch (err) {
        toast.danger("Failed to send email", {
          description: err instanceof Error ? err.message : "Please try again",
        });
      }
    },
    [singleEmailMutation]
  );

  const renderCell = useCallback(
    (f: any, columnKey: string) => {
      switch (columnKey) {
        case "facultyCode":
          return <span className="text-sm font-bold">{f.facultyCode}</span>;
        case "name":
          return (
            <span className="text-sm font-medium text-foreground">{f.name}</span>
          );
        case "email":
          return (
            <span className="text-sm text-muted-foreground">{f.email}</span>
          );
        case "mobile":
          return <span className="text-sm text-foreground/80">{f.mobile}</span>;
        case "designation":
          return (
            <span className="text-sm text-foreground/80">
              {f.designation || "—"}
            </span>
          );
        case "isActive":
          return (
            <Chip
              color={STATUS_COLOR[String(f.isActive)]}
              size="sm"
              variant="soft"
            >
              {f.isActive ? "Active" : "Inactive"}
            </Chip>
          );
        case "assignments":
          return (
            <div className="flex flex-wrap gap-1">
              {f.assignments && f.assignments.length > 0 ? (
                f.assignments.map((a: any, i: number) => (
                  <Tooltip key={i}>
                    <Tooltip.Trigger>
                      <Chip size="sm" variant="soft" className="cursor-default">
                        {a.subjectShortCode}/{a.divisionName}
                      </Chip>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div className="flex flex-col gap-1 px-1 py-1">
                        <div className="font-semibold text-small">
                          {a.subjectName}
                        </div>
                        <div className="text-tiny text-default-500">
                          {a.subjectCode} • {a.subjectType} • {a.subjectCredit}{" "}
                          Credits
                        </div>
                        <div className="text-tiny text-default-500 mt-1">
                          Assigned to: {a.divisionName}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                ))
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          );
        case "actions":
          return (
            <FacultyActionsMenu
              ariaLabel={`Actions for ${f.name}`}
              actions={[
                {
                  id: `edit-${f.id}`,
                  label: "Edit",
                  onAction: () => {
                    setEditingFaculty(f);
                    setIsEditModalOpen(true);
                  },
                },
                {
                  id: `send-password-${f.id}`,
                  label: "Send Password Email",
                  isDisabled: singleEmailMutation.isPending,
                  onAction: () => handleSingleSend(f.id, f.name),
                },
              ]}
            />
          );
        default:
          return null;
      }
    },
    [singleEmailMutation.isPending, handleSingleSend]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Faculty Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage faculty members, assignments, and roles
          </p>
        </div>
        <Button onPress={drawerState.open}>
          <Plus className="size-4" />
          Add Faculty
        </Button>
      </div>

      {/* ── Email Job Progress ────────────────────────────────── */}
      {emailJobProgress && (
        <Card className="border border-accent/20 bg-accent/5">
          <Card.Content className="p-4 flex flex-col gap-2 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                  <FileArrowUp className="size-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Sending Password Emails…
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sent:{" "}
                    <span className="font-medium text-foreground">
                      {emailJobProgress.sent}
                    </span>{" "}
                    of {emailJobProgress.total} sent • Failed:{" "}
                    <span className="font-medium text-danger">
                      {emailJobProgress.failed}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {emailJobProgress.status === "processing" ? (
                  <span className="text-xs font-medium text-accent animate-pulse">
                    Processing
                  </span>
                ) : (
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
            </div>
            {emailJobProgress.failedEmails &&
              emailJobProgress.failedEmails.length > 0 && (
                <div className="mt-2 border-t border-divider pt-2">
                  <p className="font-medium text-danger text-xs mb-1">
                    Failed Recipients:
                  </p>
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

      {/* ── DataTable ─────────────────────────────────────────── */}
      <DataTable
        data={data?.faculty || []}
        columns={COLUMNS}
        initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
        searchKeys={["name", "facultyCode", "email"]}
        searchPlaceholder="Search by name, code, or email…"
        renderCell={renderCell}
        localStorageKey="faculty_table_columns"
        isLoading={isLoading}
        isError={isError}
        error={error}
        refetch={refetch}
        emptyStateMessage="No faculty members found."
        toolbarActions={
          <Button variant="outline" size="sm">
            <ArrowDownToLine className="size-4 mr-1" />
            Export
          </Button>
        }
      />

      {/* ── Add Faculty Drawer ────────────────────────────────── */}
      <AddFacultyDrawer state={drawerState} />

      {/* ── Edit Faculty Modal ────────────────────────────────── */}
      <EditFacultyModal
        faculty={editingFaculty}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingFaculty(null);
        }}
      />
    </div>
  );
}
