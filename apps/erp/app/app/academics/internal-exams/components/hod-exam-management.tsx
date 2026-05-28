"use client";

import React, { useState } from "react";
import {
  Card,
  Button,
  Alert,
  Spinner,
  Select,
  ListBox,
  Label,
} from "@heroui/react";
import { Plus, TrashBin } from "@gravity-ui/icons";
import { useQuery } from "@tanstack/react-query";
import {
  useInternalExamsQuery,
  useCreateExamMutation,
  useDeleteExamMutation,
  useExamMarksQuery,
  useSaveMarksMutation,
  useToggleVisibilityMutation,
  useFacultyAssignmentsQuery,
} from "@/app/lib/queries/internal-exams";
import { MarksEntryTable } from "./marks-entry-table";

export function HodExamManagement() {
  const { data: examsData, isLoading: loadingExams } = useInternalExamsQuery();
  const createMutation = useCreateExamMutation();
  const deleteMutation = useDeleteExamMutation();

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [examName, setExamName] = useState("");
  const [examNumber, setExamNumber] = useState(1);
  const [targetType, setTargetType] = useState("ALL");
  const [targetYear, setTargetYear] = useState("");
  const [targetDivisionId, setTargetDivisionId] = useState("");

  // Marks management state
  const [selectedExamId, setSelectedExamId] = useState(0);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(0);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");

  // Fetch divisions for targeting
  const { data: divisionsData } = useQuery({
    queryKey: ["divisions-all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/divisions?limit=1000");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  // Fetch assignments for marks entry
  const { data: assignmentsData } = useFacultyAssignmentsQuery(selectedDivisionId || undefined);

  const { data: marksData, isLoading: loadingMarks } = useExamMarksQuery(
    selectedExamId,
    selectedAssignmentId
  );
  const saveMutation = useSaveMarksMutation(selectedExamId, selectedAssignmentId);
  const visibilityMutation = useToggleVisibilityMutation();

  const exams = examsData?.exams || [];
  const semesterId = examsData?.semesterId || 0;

  const handleCreate = async () => {
    if (!examName.trim()) return;
    try {
      await createMutation.mutateAsync({
        examName: examName.trim(),
        examNumber,
        targetType,
        targetYear: targetType === "YEAR" ? parseInt(targetYear) : undefined,
        targetDivisionId: targetType === "DIVISION" ? parseInt(targetDivisionId) : undefined,
        semesterId: semesterId || undefined,
      });
      setShowCreate(false);
      setExamName("");
      setExamNumber((exams.length || 0) + 1);
    } catch (e) {
      // error shown by mutation
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this exam? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e) {
      // error shown by mutation
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Internal Exam Management</h1>
          <p className="text-sm text-muted-foreground">Create, manage, and enter marks for internal examinations</p>
        </div>
        <Button variant="primary" onPress={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Create Exam
        </Button>
      </div>

      {/* Create Exam Form */}
      {showCreate && (
        <Card className="p-6 border border-accent/30 bg-accent/5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Create New Exam</h3>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Exam Name</label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. Internal 1"
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Exam Number</label>
                <input
                  type="number"
                  value={examNumber}
                  onChange={(e) => setExamNumber(parseInt(e.target.value) || 1)}
                  min={1}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                placeholder="Select scope"
                selectedKey={targetType}
                onSelectionChange={(key) => setTargetType(key as string)}
              >
                <Label>Target Scope</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="ALL" textValue="All">All (Institute-wide)</ListBox.Item>
                    <ListBox.Item id="YEAR" textValue="Specific Year">Specific Year</ListBox.Item>
                    <ListBox.Item id="DIVISION" textValue="Specific Division">Specific Division</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {targetType === "YEAR" && (
                <Select
                  placeholder="Choose year"
                  selectedKey={targetYear}
                  onSelectionChange={(key) => setTargetYear(key as string)}
                >
                  <Label>Year</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="1" textValue="1st Year">1st Year</ListBox.Item>
                      <ListBox.Item id="2" textValue="2nd Year">2nd Year</ListBox.Item>
                      <ListBox.Item id="3" textValue="3rd Year">3rd Year</ListBox.Item>
                      <ListBox.Item id="4" textValue="4th Year">4th Year</ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}

              {targetType === "DIVISION" && (
                <Select
                  placeholder="Choose division"
                  selectedKey={targetDivisionId}
                  onSelectionChange={(key) => setTargetDivisionId(key as string)}
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
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="tertiary" onPress={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" onPress={handleCreate} isPending={createMutation.isPending}>
                Create
              </Button>
            </div>

            {createMutation.isError && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Error</Alert.Title>
                  <Alert.Description>{(createMutation.error as Error).message}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Exams List */}
      {loadingExams ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : exams.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No internal exams created yet. Click "Create Exam" to get started.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Exam Name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Scope</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{exam.examNumber}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{exam.examName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                      {exam.targetType === "ALL" ? "Institute" : exam.targetType === "YEAR" ? `Year ${exam.targetYear}` : "Division"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(exam.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="tertiary"
                      isIconOnly
                      onPress={() => handleDelete(exam.id)}
                      aria-label="Delete exam"
                      className="text-danger"
                    >
                      <TrashBin className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Marks Management Section */}
      {exams.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Enter / Review Marks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Select
              placeholder="Select division"
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
                  {exams.map((e) => (
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
              <div className="flex justify-center py-10"><Spinner /></div>
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
        </Card>
      )}
    </div>
  );
}
