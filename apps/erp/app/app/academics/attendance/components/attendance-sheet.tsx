"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Alert, Spinner } from "@heroui/react";
import { StudentRow } from "./student-row";
import { BulkActionsBar } from "./bulk-actions-bar";
import { SaveBar } from "./save-bar";
import {
  useDivisionStudentsQuery,
  useCreateSessionMutation,
  useSaveAttendanceMutation,
  type AttendanceRecord,
} from "@/app/lib/queries/attendance";

interface AttendanceSheetProps {
  timetableEntryId: number;
  divisionId: number;
  date: string;
  subjectName: string;
  /** Pre-existing session ID if session already created */
  existingSessionId: number | null;
  /** Pre-existing records if session already created */
  existingRecords?: AttendanceRecord[];
}

export function AttendanceSheet({
  timetableEntryId,
  divisionId,
  date,
  subjectName,
  existingSessionId,
  existingRecords,
}: AttendanceSheetProps) {
  // ─── Data ──────────────────────────────────────────────────────
  const studentsQuery = useDivisionStudentsQuery(divisionId);
  const createSessionMut = useCreateSessionMutation();

  // Session ID: either pre-existing or created via mutation
  const [sessionId, setSessionId] = useState<number | null>(existingSessionId);
  const [initialRecords, setInitialRecords] = useState<Map<number, string>>(
    new Map((existingRecords ?? []).map((r) => [r.studentId, r.status]))
  );

  // Local status map: studentId → "present" | "absent"
  const [statusMap, setStatusMap] = useState<Map<number, string>>(
    new Map(initialRecords)
  );

  // Track whether records have been loaded from server
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false);

  // Sync when existingSessionId/existingRecords change (e.g., switching slots)
  useEffect(() => {
    setSessionId(existingSessionId);
    setHasLoadedRecords(false); // reset so records are re-fetched for new slot
    const map = new Map(
      (existingRecords ?? []).map((r) => [r.studentId, r.status])
    );
    setInitialRecords(map);
    setStatusMap(new Map(map));
  }, [existingSessionId, existingRecords]);

  // Always fetch/create session to load records (POST acts as get-or-create)

  useEffect(() => {
    if (createSessionMut.isPending || hasLoadedRecords) return;

    createSessionMut.mutate(
      { timetableEntryId, date },
      {
        onSuccess: (data) => {
          setSessionId(data.sessionId);
          setHasLoadedRecords(true);
          if (data.records.length > 0) {
            const map = new Map(
              data.records.map((r) => [r.studentId, r.status])
            );
            setInitialRecords(map);
            setStatusMap(new Map(map));
          }
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableEntryId, date]);

  const saveMutation = useSaveAttendanceMutation(sessionId ?? 0, date);

  // ─── Derived ───────────────────────────────────────────────────
  const students = studentsQuery.data?.students ?? [];

  // Ensure all students have a status (default: absent)
  useEffect(() => {
    if (students.length > 0) {
      setStatusMap((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const s of students) {
          if (!next.has(s.id)) {
            next.set(s.id, "absent");
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [students]);

  // Changed records (diff from initial)
  const changedRecords = useMemo(() => {
    const changes: { studentId: number; status: string }[] = [];
    statusMap.forEach((status, studentId) => {
      const original = initialRecords.get(studentId);
      if (original !== status) {
        changes.push({ studentId, status });
      }
    });
    return changes;
  }, [statusMap, initialRecords]);

  const presentCount = useMemo(
    () => Array.from(statusMap.values()).filter((s) => s === "present").length,
    [statusMap]
  );
  const absentCount = students.length - presentCount;

  // ─── Actions ───────────────────────────────────────────────────
  const toggleStudent = useCallback((studentId: number) => {
    setStatusMap((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId) ?? "absent";
      next.set(studentId, current === "present" ? "absent" : "present");
      return next;
    });
  }, []);

  const markAllPresent = useCallback(() => {
    setStatusMap((prev) => {
      const next = new Map(prev);
      for (const s of students) next.set(s.id, "present");
      return next;
    });
  }, [students]);

  const markAllAbsent = useCallback(() => {
    setStatusMap((prev) => {
      const next = new Map(prev);
      for (const s of students) next.set(s.id, "absent");
      return next;
    });
  }, [students]);

  const discardChanges = useCallback(() => {
    setStatusMap(new Map(initialRecords));
  }, [initialRecords]);

  const handleSave = useCallback(() => {
    if (!sessionId || changedRecords.length === 0) return;

    // Send ALL records (not just changed ones) on first save of a new session
    const isNewSession = initialRecords.size === 0;
    const recordsToSend = isNewSession
      ? students.map((s) => ({
          studentId: s.id,
          status: statusMap.get(s.id) ?? "absent",
        }))
      : changedRecords;

    saveMutation.mutate(recordsToSend, {
      onSuccess: () => {
        // Update initial records to reflect saved state
        const newInitial = new Map(statusMap);
        setInitialRecords(newInitial);
      },
    });
  }, [sessionId, changedRecords, students, statusMap, initialRecords, saveMutation]);

  // ─── Loading States ────────────────────────────────────────────
  if (studentsQuery.isLoading || createSessionMut.isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <span className="ml-3 text-sm text-muted-foreground">Loading students…</span>
      </div>
    );
  }

  if (studentsQuery.isError) {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Failed to load students</Alert.Title>
          <Alert.Description>{studentsQuery.error.message}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (students.length === 0) {
    return (
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>No students</Alert.Title>
          <Alert.Description>
            No students found in this division.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{subjectName}</span>
        <span>·</span>
        <span>{date}</span>
      </div>

      {/* Success feedback */}
      {saveMutation.isSuccess && (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Attendance saved successfully</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {/* Error feedback */}
      {saveMutation.isError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Save failed</Alert.Title>
            <Alert.Description>{saveMutation.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Bulk actions */}
      <BulkActionsBar
        totalStudents={students.length}
        presentCount={presentCount}
        absentCount={absentCount}
        onMarkAllPresent={markAllPresent}
        onMarkAllAbsent={markAllAbsent}
      />

      {/* Student list */}
      <div className="flex flex-col gap-1.5">
        {students.map((student) => (
          <StudentRow
            key={student.id}
            studentId={student.id}
            fullName={student.fullName}
            rollId={student.studentId || student.enrollmentId}
            status={(statusMap.get(student.id) ?? "absent") as "present" | "absent"}
            isChanged={
              (statusMap.get(student.id) ?? "absent") !==
              (initialRecords.get(student.id) ?? "__none__")
            }
            onToggle={toggleStudent}
          />
        ))}
      </div>

      {/* Sticky save bar */}
      <SaveBar
        changedCount={changedRecords.length}
        isSaving={saveMutation.isPending}
        onSave={handleSave}
        onDiscard={discardChanges}
      />
    </div>
  );
}
