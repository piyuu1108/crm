"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  Chip,
  useOverlayState,
  AlertDialog,
  Spinner,
  toast,
} from "@heroui/react";
import { Plus, TrashBin } from "@gravity-ui/icons";
import { useAssignmentsQuery, useDeleteAssignmentMutation } from "@/app/lib/queries/assignments";
import { AssignCounselorDrawer } from "./assign-counselor-drawer";
import { sortDivisions } from "@/app/lib/utils/sort-utils";

// ─── Specialization badge colors ──────────────────────────────────────────────
const SPEC_COLOR: Record<string, "accent" | "success" | "warning"> = {
  AI: "accent",
  DS: "success",
  REGULAR: "warning",
};

export default function AssignmentsPage() {
  const { data, isLoading, isError, error, refetch } = useAssignmentsQuery();
  const deleteMutation = useDeleteAssignmentMutation();

  const drawerState = useOverlayState();
  const alertState = useOverlayState();

  const [preselectedDivisionId, setPreselectedDivisionId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ facultyId: number; divisionId: number; facultyName: string; divisionName: string } | null>(null);

  const handleOpenDrawer = (divId?: number) => {
    setPreselectedDivisionId(divId || null);
    drawerState.open();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync({
        facultyId: deleteTarget.facultyId,
        divisionId: deleteTarget.divisionId,
      });

      toast.success("Assignment removed", {
        description: `${deleteTarget.facultyName} is no longer counseling ${deleteTarget.divisionName}.`,
      });
      alertState.close();
    } catch (err) {
      toast.danger("Failed to remove assignment", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Counselor Assignments
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign and manage division counselors
          </p>
        </div>
        <Button onPress={() => handleOpenDrawer()}>
          <Plus className="size-4" />
          Assign Counselor
        </Button>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" color="accent" />
        </div>
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load assignments
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
            </div>
            <Button variant="secondary" onPress={() => refetch()}>
              Try Again
            </Button>
          </Card.Content>
        </Card>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortDivisions(data.divisions, (d) => d.displayName).map((div) => (
            <Card key={div.id} className="border border-divider">
              <Card.Content className="p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold font-mono text-foreground">
                      {div.displayName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Batch {div.batchYear} · Sem {div.semesterNo}
                    </p>
                  </div>
                  <Chip
                    color={SPEC_COLOR[div.specialization] || "accent"}
                    size="sm"
                    variant="soft"
                  >
                    {div.specialization}
                  </Chip>
                </div>

                {/* Counselors */}
                <div className="flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Assigned Counselors
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {div.counselors.length === 0 ? (
                      <span className="text-sm italic text-muted-foreground/60">
                        Unassigned
                      </span>
                    ) : (
                      div.counselors.map((c) => (
                        <div
                          key={c.facultyId}
                          className="group relative inline-flex items-center gap-2 rounded-full border border-divider bg-default/5 px-3 py-1 text-sm transition-colors hover:border-danger/30 hover:bg-danger/5"
                        >
                          <span className="font-medium text-foreground group-hover:text-danger transition-colors">
                            {c.facultyName}
                          </span>
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-danger/70 hover:text-danger focus:opacity-100 outline-none"
                            onClick={() => {
                              setDeleteTarget({
                                facultyId: c.facultyId,
                                divisionId: div.id,
                                facultyName: c.facultyName,
                                divisionName: div.displayName,
                              });
                              alertState.open();
                            }}
                            title="Remove assignment"
                          >
                            <TrashBin className="size-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-divider flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => handleOpenDrawer(div.id)}
                    // isDisabled={!data.activeSemester}
                  >
                    <Plus className="size-3" />
                    Assign
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : null}

      {/* ── Assign Counselor Drawer ────────────────────────────── */}
      <AssignCounselorDrawer
        state={drawerState}
        preselectedDivisionId={preselectedDivisionId}
      />

      {/* ── Remove Assignment Alert ────────────────────────────── */}
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={alertState.isOpen} onOpenChange={alertState.setOpen}>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Remove Assignment</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Are you sure you want to remove <strong>{deleteTarget?.facultyName}</strong> as a counselor for <strong>{deleteTarget?.divisionName}</strong>?
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  This will only remove them for the active semester. Historical records are preserved.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="secondary" onPress={alertState.close} isDisabled={deleteMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  onPress={handleConfirmDelete} 
                  isDisabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Spinner color="current" size="sm" />}
                  {deleteMutation.isPending ? "Removing…" : "Remove"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
