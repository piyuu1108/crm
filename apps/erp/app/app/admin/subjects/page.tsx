"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Modal,
  Spinner,
  Tooltip,
  useOverlayState,
  toast,
  Label,
} from "@heroui/react";
import {
  Plus,
  ArrowDownToLine,
} from "@gravity-ui/icons";
import {
  adminSubjectsListKey,
  useAdminSubjectsListQuery,
  useDeleteSubjectMutation,
  type SubjectAdminListItem,
} from "@/app/lib/queries/subjects";
import { AddSubjectDrawer } from "./add-subject-drawer";
import { EditSubjectModal } from "./edit-subject-modal";
import { SubjectActionsMenu } from "./subject-actions-menu";
import { DataTable, type TableColumnDef } from "@/components/data-table";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, "accent" | "success" | "warning" | "danger" | "default"> = {
  theory: "accent",
  practical: "success",
  both: "warning",
  project_minor: "default",
  project_major: "danger",
};

const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  practical: "Practical",
  both: "Both",
  project_minor: "Project Minor",
  project_major: "Project Major",
};

const COLUMNS: TableColumnDef[] = [
  { name: "Code", uid: "code", allowsSorting: true, isRowHeader: true, className: "w-[110px]" },
  { name: "Short Name", uid: "shortCode", className: "w-[100px]" },
  { name: "Name", uid: "name", allowsSorting: true },
  { name: "Semester", uid: "semester", allowsSorting: true, className: "w-[100px]" },
  { name: "Credit", uid: "credit", className: "w-[80px]" },
  { name: "Type", uid: "subjectType", className: "w-[110px]" },
  { name: "Assignments", uid: "assignments", allowsSorting: true },
  { name: "Actions", uid: "actions", className: "w-[56px]" },
];

const INITIAL_VISIBLE_COLUMNS = [
  "code",
  "shortCode",
  "name",
  "semester",
  "credit",
  "subjectType",
  "assignments",
  "actions",
];

// ─── Export helper ────────────────────────────────────────────────────────────

function exportSubjectsCSV(subjects: SubjectAdminListItem[]) {
  const headers = [
    "Code",
    "Short Code",
    "Name",
    "Semester",
    "Credit",
    "Type",
    "Int.Theory",
    "Ext.Theory",
    "Theory Pass",
    "Int.Practical",
    "Ext.Practical",
    "Practical Pass",
    "Assignments",
  ];
  const rows = subjects.map((s) => [
    s.code,
    s.shortCode ?? "",
    s.name,
    s.semester ?? "",
    s.credit ?? "",
    s.subjectType,
    s.internalTheoryMax ?? "",
    s.externalTheoryMax ?? "",
    s.theoryPassingMarks ?? "",
    s.internalPracticalMax ?? "",
    s.externalPracticalMax ?? "",
    s.practicalPassingMarks ?? "",
    s.assignments.map((a) => `${a.divisionName}(${a.facultyName})`).join("; "),
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `subjects_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  subject,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  subject: SubjectAdminListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Modal.Container placement="center">
          <Modal.Dialog className="w-full max-w-sm">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-danger">Remove Subject</h2>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-foreground">
                Are you sure you want to remove{" "}
                <strong>
                  {subject?.name} ({subject?.code})
                </strong>
                ?
              </p>
              {subject && subject.assignments.length > 0 && (
                <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
                  <p className="text-xs font-semibold text-danger mb-1">
                    ⚠ Cannot delete — active assignments exist
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This subject is used in {subject.assignments.length} assignment(s). Remove all
                    faculty-subject assignments first, then try again.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {subject.assignments.slice(0, 5).map((a, i) => (
                      <li key={i} className="text-xs text-foreground/70">
                        • {a.divisionName} — {a.facultyName}
                      </li>
                    ))}
                    {subject.assignments.length > 5 && (
                      <li className="text-xs text-muted-foreground">
                        + {subject.assignments.length - 5} more…
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-danger text-white"
                onPress={onConfirm}
                isPending={isLoading}
                isDisabled={isLoading || (subject?.assignments?.length ?? 0) > 0}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? "Removing…" : "Remove Subject"}
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubjectsPage() {
  const { activeRole } = useAuthStore();
  const isAdmin = activeRole === "principal" || activeRole === "vice_principal";

  const columns = useMemo(() => {
    if (isAdmin) {
      return COLUMNS.filter((col) => col.uid !== "actions" && col.uid !== "assignments");
    }
    return COLUMNS;
  }, [isAdmin]);

  const [editingSubject, setEditingSubject] = useState<SubjectAdminListItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [deletingSubject, setDeletingSubject] = useState<SubjectAdminListItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const drawerState = useOverlayState();
  const queryClient = useQueryClient();
  const router = useRouter();
  const deleteMutation = useDeleteSubjectMutation();

  const { data, isLoading, isError, error, refetch } = useAdminSubjectsListQuery();

  const handleRecover = useCallback(() => {
    queryClient.removeQueries({ queryKey: adminSubjectsListKey });
    void refetch();
    router.refresh();
  }, [queryClient, refetch, router]);

  const handleDeleteConfirm = async () => {
    if (!deletingSubject) return;
    try {
      await deleteMutation.mutateAsync(deletingSubject.id);
      toast.success("Subject removed", {
        description: `"${deletingSubject.name}" has been deleted.`,
      });
      setIsDeleteModalOpen(false);
      setDeletingSubject(null);
    } catch (err) {
      toast.danger("Failed to remove subject", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const renderCell = useCallback((s: SubjectAdminListItem, columnKey: string) => {
    switch (columnKey) {
      case "code":
        return <span className="text-sm font-bold font-mono">{s.code}</span>;
      case "shortCode":
        return <span className="text-sm text-muted-foreground">{s.shortCode || "—"}</span>;
      case "name":
        return <span className="text-sm font-medium text-foreground">{s.name}</span>;
      case "semester":
        return (
          <span className="text-sm text-foreground/80 font-mono">
            {s.semester != null ? `Sem ${s.semester}` : "—"}
          </span>
        );
      case "credit":
        return (
          <span className="text-sm text-foreground/80 font-mono">
            {s.credit != null ? s.credit : "—"}
          </span>
        );
      case "subjectType":
        return (
          <Chip
            color={TYPE_COLOR[s.subjectType] ?? "default"}
            size="sm"
            variant="soft"
          >
            {TYPE_LABELS[s.subjectType] ?? s.subjectType}
          </Chip>
        );
      case "assignments":
        return (
          <div className="flex flex-wrap gap-1">
            {s.assignments && s.assignments.length > 0 ? (
              s.assignments.map((a, i) => (
                <Tooltip key={i}>
                  <Tooltip.Trigger>
                    <Chip size="sm" variant="soft" className="cursor-default">
                      {a.divisionName}
                    </Chip>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div className="flex flex-col gap-1 px-1 py-1">
                      <div className="font-semibold text-small">{a.divisionName}</div>
                      <div className="text-tiny text-default-500">
                        Faculty: {a.facultyName}
                      </div>
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        );
      case "actions":
        return (
          <SubjectActionsMenu
            ariaLabel={`Actions for ${s.name}`}
            actions={[
              {
                id: `edit-${s.id}`,
                label: "Edit",
                onAction: () => {
                  setEditingSubject(s);
                  setIsEditModalOpen(true);
                },
              },
              {
                id: `remove-${s.id}`,
                label: "Remove",
                isDanger: true,
                onAction: () => {
                  setDeletingSubject(s);
                  setIsDeleteModalOpen(true);
                },
              },
            ]}
          />
        );
      default:
        return null;
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subject Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage subjects, marking schemes, and assignments
          </p>
        </div>
        {!isAdmin && (
          <Button onPress={drawerState.open}>
            <Plus className="size-4" />
            Add Subject
          </Button>
        )}
      </div>

      <DataTable
        data={data || []}
        columns={columns}
        initialVisibleColumns={INITIAL_VISIBLE_COLUMNS.filter(c => !isAdmin || (c !== "actions" && c !== "assignments"))}
        searchKeys={["code", "name", "shortCode"]}
        searchPlaceholder="Search by code or name..."
        renderCell={renderCell}
        localStorageKey="subjects_table_columns"
        isLoading={isLoading}
        isError={isError}
        error={error}
        refetch={refetch}
        emptyStateMessage="No subjects found."
        toolbarActions={
          <Button
            variant="tertiary"
            size="sm"
            onPress={() => data && exportSubjectsCSV(data)}
            isDisabled={!data || data.length === 0}
          >
            <ArrowDownToLine className="size-4 mr-1" />
            Export
          </Button>
        }
      />

      {/* ── Add Subject Drawer ───────────────────────────────────────── */}
      {!isAdmin && <AddSubjectDrawer state={drawerState} />}

      {/* ── Edit Subject Modal ───────────────────────────────────────── */}
      {!isAdmin && (
        <EditSubjectModal
          subject={editingSubject}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSubject(null);
          }}
        />
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────── */}
      {!isAdmin && (
        <DeleteConfirmModal
          subject={deletingSubject}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingSubject(null);
          }}
          onConfirm={handleDeleteConfirm}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
