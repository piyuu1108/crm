"use client";

import React, { useState, useMemo } from "react";
import { Alert, Spinner, Button, Select, ListBox } from "@heroui/react";
import { Clock, BookOpen, Persons, ArrowLeft } from "@gravity-ui/icons";
import { AttendanceSheet } from "./attendance-sheet";
import { AttendanceFilters } from "./attendance-filters";
import {
  useBrowseSessionsQuery,
  type BrowseSession,
  type AttendanceRecord,
} from "@/app/lib/queries/attendance";

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

interface CounselorHodViewProps {
  role: "counselor" | "hod";
}

export function CounselorHodView({ role }: CounselorHodViewProps) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDivisionId, setSelectedDivisionId] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [activeSession, setActiveSession] = useState<BrowseSession | null>(null);

  const browseQuery = useBrowseSessionsQuery(selectedDivisionId, selectedDate);
  const divisions = browseQuery.data?.divisions ?? [];
  const sessions = browseQuery.data?.sessions ?? [];

  // Subject list for filter
  const subjects = useMemo(() => {
    const set = new Set(sessions.map((s) => s.subjectName));
    return Array.from(set).sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!subjectFilter) return sessions;
    return sessions.filter((s) => s.subjectName === subjectFilter);
  }, [sessions, subjectFilter]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setActiveSession(null);
    setSubjectFilter("");
  };

  const handleDivisionChange = (divId: number) => {
    setSelectedDivisionId(divId);
    setActiveSession(null);
    setSubjectFilter("");
  };

  // If editing a session, show the attendance sheet
  if (activeSession) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="tertiary"
          size="sm"
          onPress={() => setActiveSession(null)}
          className="w-fit gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back to sessions
        </Button>

        <AttendanceSheet
          key={activeSession.id}
          timetableEntryId={activeSession.timetableId}
          divisionId={selectedDivisionId}
          date={selectedDate}
          subjectName={activeSession.subjectName}
          existingSessionId={activeSession.id}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {role === "hod" ? "Attendance Management" : "Division Attendance"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "hod"
            ? "View and edit attendance for any division."
            : "View and edit attendance for your assigned divisions."}
        </p>
      </div>

      {/* Division selector + date filter */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Division picker */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Division</label>
          <Select
            className="min-w-[200px]"
            placeholder="Select Division"
            selectedKey={selectedDivisionId ? selectedDivisionId.toString() : "0"}
            onSelectionChange={(key) => handleDivisionChange(parseInt(key as string, 10) || 0)}
          >
            <Select.Trigger className="bg-[var(--field-background)] border border-[var(--border)] hover:border-accent/40 rounded-lg py-2 px-3 text-sm text-[var(--foreground)] flex items-center justify-between shadow-sm min-h-[38px] w-full">
              <Select.Value className="text-sm font-medium text-[var(--foreground)]" />
              <Select.Indicator className="size-4 text-default-500" />
            </Select.Trigger>
            <Select.Popover>
              <ListBox className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-1 min-w-[200px] outline-none">
                <ListBox.Item id="0" textValue="Select Division" className="text-sm text-[var(--foreground)] rounded-lg px-3 py-2 hover:bg-default-100 hover:text-foreground cursor-pointer flex items-center outline-none">
                  Select Division
                </ListBox.Item>
                {divisions.map((d) => (
                  <ListBox.Item key={d.id.toString()} id={d.id.toString()} textValue={d.displayName} className="text-sm text-[var(--foreground)] rounded-lg px-3 py-2 hover:bg-default-100 hover:text-foreground cursor-pointer flex items-center outline-none">
                    {d.displayName}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Date + Subject filters */}
        <AttendanceFilters
          date={selectedDate}
          onDateChange={handleDateChange}
          subjects={subjects}
          selectedSubject={subjectFilter}
          onSubjectChange={setSubjectFilter}
        />
      </div>

      {/* Loading */}
      {browseQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error */}
      {browseQuery.isError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load sessions</Alert.Title>
            <Alert.Description>{browseQuery.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Sessions list */}
      {browseQuery.isSuccess && selectedDivisionId > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Sessions ({filteredSessions.length})
          </h2>

          {filteredSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-divider py-8 text-center text-sm text-muted-foreground">
              No attendance sessions found for this date.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSessions.map((session) => {
                const pct =
                  session.totalStudents > 0
                    ? Math.round(
                        (session.presentCount / session.totalStudents) * 100
                      )
                    : 0;

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setActiveSession(session)}
                    className="group flex flex-col gap-2.5 rounded-xl border border-divider bg-content1 px-4 py-3.5 text-left transition-all hover:border-accent/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {/* Subject */}
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 shrink-0 text-accent" />
                      <span className="truncate text-sm font-semibold text-foreground">
                        {session.subjectName}
                      </span>
                    </div>

                    {/* Faculty + Time */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{session.facultyName}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTime(session.startTime)} – {formatTime(session.endTime)}
                      </span>
                    </div>

                    {/* Stats bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-default/30">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <Persons className="size-3" />
                        {session.presentCount}/{session.totalStudents}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state: no division selected */}
      {selectedDivisionId === 0 && browseQuery.isSuccess && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-divider py-16 text-sm text-muted-foreground">
          Select a division to view attendance sessions.
        </div>
      )}
    </div>
  );
}
