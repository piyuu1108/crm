"use client";

import React, { useState } from "react";
import {
  Card,
  Spinner,
  Select,
  ListBox,
  Label,
  Alert,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import {
  useInternalExamsQuery,
  useExamMarksQuery,
  useSaveMarksMutation,
  useToggleVisibilityMutation,
  useFacultyAssignmentsQuery,
} from "@/app/lib/queries/internal-exams";
import { useCounselorDivisionsQuery } from "@/app/lib/queries/counselor";
import { MarksEntryTable } from "./marks-entry-table";

export function CounselorMarksView() {
  const { data: examsData, isLoading: loadingExams } = useInternalExamsQuery();

  // Fetch counselor's assigned divisions
  const { data: myDivisions = [], isLoading: loadingDivisions } = useCounselorDivisionsQuery();

  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(0);
  const [selectedExamId, setSelectedExamId] = useState(0);

  // Fetch assignments for selected division — role-aware, returns flat array
  const { data: assignments = [] } = useFacultyAssignmentsQuery(selectedDivisionId || undefined);

  const { data: marksData, isLoading: loadingMarks } = useExamMarksQuery(
    selectedExamId,
    selectedAssignmentId
  );
  const saveMutation = useSaveMarksMutation(selectedExamId, selectedAssignmentId);
  const visibilityMutation = useToggleVisibilityMutation();

  const exams = examsData?.exams || [];

  if (loadingExams || loadingDivisions) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Internal Exam — Marks Entry</h1>
        <p className="text-sm text-muted-foreground">Select a division, subject, and exam to enter marks</p>
      </div>

      {exams.length === 0 ? (
        <Alert>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No Exams</Alert.Title>
            <Alert.Description>No internal exams have been created yet.</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <Card className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Select
              placeholder="Select division"
              selectedKey={selectedDivisionId}
              onSelectionChange={(key) => {
                setSelectedDivisionId(key as string);
                setSelectedAssignmentId(0);
              }}
            >
              <Label>Your Division</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {myDivisions.map((div: any) => (
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
              <Label>Subject (Any)</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {assignments.map((a: any) => (
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

          {saveMutation.isSuccess && (
            <Alert status="success" className="mt-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Saved</Alert.Title>
                <Alert.Description>Marks saved successfully.</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
}
