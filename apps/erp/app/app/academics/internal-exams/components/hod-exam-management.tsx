"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Alert,
  Spinner,
  Chip,
  Select,
  ListBox,
  Label,
  Skeleton,
  AlertDialog,
  toast,
} from "@heroui/react";
import {
  Plus,
  FileText,
  CalendarDays,
  BookOpen,
  Users,
  Pencil,
  Trash2,
  Eye,
  Building2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useExamWizardListQuery,
  useDeleteDraftMutation,
} from "@/app/lib/queries/exam-wizard";
import {
  useInternalExamsQuery,
  useExamMarksQuery,
  useSaveMarksMutation,
  useToggleVisibilityMutation,
  useFacultyAssignmentsQuery,
} from "@/app/lib/queries/internal-exams";
import { MarksEntryTable } from "./marks-entry-table";

// ─── Status Badge ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "success" | "accent" | "warning" | "danger" | "default"> = {
  draft: "default",
  scheduled: "accent",
  seating_pending: "warning",
  active: "success",
  completed: "success",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  seating_pending: "Seating Pending",
  active: "Active",
  completed: "Completed",
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

function StatMini({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Card className="rounded-2xl border border-divider/30 bg-surface p-4 shadow-sm hover:translate-y-[-1px] transition-all duration-200">
      <Card.Content className="p-0 flex items-center gap-3">
        <div
          className={`flex items-center justify-center size-10 rounded-xl ${
            accent ? "bg-accent/10 text-accent" : "bg-default-100 text-default-500"
          }`}
        >
          <Icon className="size-4.5" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-default-500">{label}</p>
        </div>
      </Card.Content>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyExamState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-accent/10 text-accent mb-4">
          <FileText className="size-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No Examinations Yet</h3>
        <p className="text-sm text-default-500 max-w-sm mb-6">
          Create your first internal examination using the guided wizard to set up scope, subjects, schedule, and hall allocation.
        </p>
        <Button onPress={onCreate}>
          <Plus className="size-4" />
          Create Examination
        </Button>
      </div>
    </Card>
  );
}

// ─── Exam Card ───────────────────────────────────────────────────────────────

function ExamCard({
  exam,
  onEdit,
  onDelete,
}: {
  exam: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusColor = STATUS_COLORS[exam.status] || "default";
  const statusLabel = STATUS_LABELS[exam.status] || exam.status;
  const progress = Math.round(((exam.completedStep || 0) / 7) * 100);

  return (
    <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 group">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground truncate">{exam.examName}</h3>
              <Chip size="sm" variant="tertiary" color={statusColor}>
                {statusLabel}
              </Chip>
            </div>
            <div className="flex items-center gap-3 text-xs text-default-400">
              <span className="flex items-center gap-1">
                <FileText className="size-3" />
                #{exam.examNumber} • {(exam.examType || "internal").toUpperCase()}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {new Date(exam.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 text-xs text-default-500 mb-3">
          {exam.divisionCount > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {exam.divisionCount} div{exam.divisionCount !== 1 ? "s" : ""}
            </span>
          )}
          {exam.subjectCount > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="size-3" />
              {exam.subjectCount} subjects
            </span>
          )}
        </div>

        {/* Progress bar */}
        {exam.status === "draft" && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-default-400 mb-1">
              <span>Setup Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-default-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-divider/20">
          <Button
            size="sm"
            variant={exam.status === "draft" ? "primary" : "secondary"}
            className="flex-1"
            onPress={onEdit}
          >
            {exam.status === "draft" ? (
              <>
                <Pencil className="size-3.5" />
                Continue Setup
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                View Details
              </>
            )}
          </Button>

          {exam.status === "draft" && (
            <Button
              size="sm"
              variant="tertiary"
              isIconOnly
              onPress={onDelete}
              className="text-danger"
              aria-label="Delete draft"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HodExamManagement() {
  const router = useRouter();
  const { data: wizardData, isLoading: loadingWizard } = useExamWizardListQuery();
  const deleteDraftMutation = useDeleteDraftMutation();

  // Legacy marks management
  const { data: examsData } = useInternalExamsQuery();
  const [selectedExamId, setSelectedExamId] = useState(0);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(0);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");

  const { data: assignmentsData } = useFacultyAssignmentsQuery(selectedDivisionId || undefined, !!selectedDivisionId);
  const { data: marksData, isLoading: loadingMarks } = useExamMarksQuery(selectedExamId, selectedAssignmentId);
  const saveMutation = useSaveMarksMutation(selectedExamId, selectedAssignmentId);
  const visibilityMutation = useToggleVisibilityMutation();

  // Fetch divisions for marks selectors
  const { data: divisionsData } = useQuery({
    queryKey: ["divisions-all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/divisions?limit=1000");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  // Delete dialog
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const wizardExams = wizardData?.exams || [];
  const legacyExams = examsData?.exams || [];

  // KPI counts
  const draftCount = wizardExams.filter((e) => e.status === "draft").length;
  const scheduledCount = wizardExams.filter((e) => e.status === "scheduled" || e.status === "active").length;
  const totalExams = wizardExams.length || legacyExams.length;

  const handleCreate = () => router.push("/app/academics/internal-exams/create");
  const handleEdit = (id: number) => router.push(`/app/academics/internal-exams/create?examId=${id}`);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDraftMutation.mutateAsync(deleteId);
      toast.success("Draft deleted");
    } catch (err) {
      toast.danger("Failed to delete", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
    setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Internal Examinations</h1>
          <p className="text-sm text-default-500 mt-0.5">
            Create, schedule, and manage internal assessments with guided setup.
          </p>
        </div>
        <Button onPress={handleCreate}>
          <Plus className="size-4" />
          Create Examination
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatMini label="Total Exams" value={totalExams} icon={FileText} accent />
        <StatMini label="Drafts" value={draftCount} icon={Clock} />
        <StatMini label="Scheduled / Active" value={scheduledCount} icon={CalendarDays} />
        <StatMini label="Subjects Covered" value={wizardExams.reduce((s, e) => s + (e.subjectCount || 0), 0)} icon={BookOpen} />
      </div>

      {/* Exams Grid */}
      {loadingWizard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-2xl border border-divider/30 bg-surface shadow-sm p-5">
              <Skeleton className="h-5 w-3/4 rounded mb-3" />
              <Skeleton className="h-3 w-1/2 rounded mb-2" />
              <Skeleton className="h-2 w-full rounded mb-4" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      ) : wizardExams.length === 0 && legacyExams.length === 0 ? (
        <EmptyExamState onCreate={handleCreate} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wizardExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={() => handleEdit(exam.id)}
              onDelete={() => setDeleteId(exam.id)}
            />
          ))}
        </div>
      )}

      {/* Marks Management Section */}
      {legacyExams.length > 0 && (
        <Card className="rounded-2xl border border-divider/30 bg-surface shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-divider/20">
            <h3 className="text-lg font-semibold text-foreground">Enter / Review Marks</h3>
            <p className="text-sm text-default-500 mt-0.5">Select a division, subject, and exam to manage marks.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Select
                placeholder="Select division"
                variant="secondary"
                selectedKey={selectedDivisionId}
                onSelectionChange={(key) => {
                  setSelectedDivisionId(key as string);
                  setSelectedAssignmentId(0);
                }}
              >
                <Label>Division</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(divisionsData?.data?.divisions || []).map((div: any) => (
                      <ListBox.Item key={div.id.toString()} id={div.id.toString()} textValue={div.displayName}>
                        {div.displayName}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <Select
                placeholder="Select subject"
                variant="secondary"
                selectedKey={selectedAssignmentId ? selectedAssignmentId.toString() : ""}
                onSelectionChange={(key) => setSelectedAssignmentId(parseInt(key as string) || 0)}
                isDisabled={!selectedDivisionId}
              >
                <Label>Subject</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(assignmentsData || []).map((a: any) => (
                      <ListBox.Item key={a.id.toString()} id={a.id.toString()} textValue={a.subjectName}>
                        {a.subjectName} — {a.facultyName}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <Select
                placeholder="Select exam"
                variant="secondary"
                selectedKey={selectedExamId ? selectedExamId.toString() : ""}
                onSelectionChange={(key) => setSelectedExamId(parseInt(key as string) || 0)}
              >
                <Label>Exam</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {legacyExams.map((e) => (
                      <ListBox.Item key={e.id.toString()} id={e.id.toString()} textValue={e.examName}>
                        {e.examName}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {selectedExamId > 0 && selectedAssignmentId > 0 && (
              loadingMarks ? (
                <div className="flex justify-center py-10"><Spinner size="lg" /></div>
              ) : marksData ? (
                <MarksEntryTable
                  students={marksData.students}
                  existingMarks={marksData.marks}
                  subjectType={marksData.assignment.subjectType}
                  maxMarks={marksData.maxMarks}
                  subjectName={marksData.assignment.subjectName}
                  divisionName={marksData.assignment.divisionName}
                  isVisible={marksData.marks.length > 0 ? marksData.marks[0].isVisible : false}
                  onVisibilityChange={(visible) => {
                    visibilityMutation.mutate({
                      examId: selectedExamId,
                      assignmentId: selectedAssignmentId,
                      isVisible: visible,
                    });
                  }}
                  onSave={(records) => {
                    saveMutation.mutate({
                      examId: selectedExamId,
                      assignmentId: selectedAssignmentId,
                      isDraft: false,
                      records,
                    });
                  }}
                  isSaving={saveMutation.isPending}
                />
              ) : null
            )}
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Backdrop isOpen={!!deleteId} onOpenChange={() => setDeleteId(null)} variant="blur">
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete Draft Exam?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-default-600">
                This will permanently delete this exam draft and all associated data. This cannot be undone.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={deleteDraftMutation.isPending}>
                Cancel
              </Button>
              <Button variant="danger" onPress={confirmDelete} isPending={deleteDraftMutation.isPending}>
                Delete
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}
