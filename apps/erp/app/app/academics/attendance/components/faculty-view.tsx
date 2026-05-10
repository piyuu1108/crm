"use client";

import React, { useState, useMemo } from "react";
import { Alert, Spinner } from "@heroui/react";
import { LectureSlotCard } from "./lecture-slot-card";
import { AttendanceSheet } from "./attendance-sheet";
import { AttendanceFilters } from "./attendance-filters";
import {
  useFacultySlotsQuery,
  type AttendanceSlot,
} from "@/app/lib/queries/attendance";

export function FacultyAttendanceView() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState<AttendanceSlot | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");

  const slotsQuery = useFacultySlotsQuery(selectedDate);
  const slots = slotsQuery.data?.slots ?? [];

  // Subject list for filter
  const subjects = useMemo(() => {
    const set = new Set(slots.map((s) => s.subjectName));
    return Array.from(set).sort();
  }, [slots]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    if (!subjectFilter) return slots;
    return slots.filter((s) => s.subjectName === subjectFilter);
  }, [slots, subjectFilter]);

  // Reset selection when date changes
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSubjectFilter("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Mark Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a lecture to mark attendance for your classes.
        </p>
      </div>

      {/* Filters */}
      <AttendanceFilters
        date={selectedDate}
        onDateChange={handleDateChange}
        subjects={subjects}
        selectedSubject={subjectFilter}
        onSubjectChange={setSubjectFilter}
      />

      {/* Loading */}
      {slotsQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error */}
      {slotsQuery.isError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load schedule</Alert.Title>
            <Alert.Description>{slotsQuery.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Content */}
      {slotsQuery.isSuccess && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Lecture slot list */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {selectedDate === today ? "Today's" : "Selected Day's"} Lectures
            </h2>

            {filteredSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-divider py-8 text-center text-sm text-muted-foreground">
                No lectures scheduled for this day.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredSlots.map((slot) => (
                  <LectureSlotCard
                    key={slot.timetableId}
                    subjectName={slot.subjectName}
                    divisionName={slot.divisionName}
                    startTime={slot.startTime}
                    endTime={slot.endTime}
                    isLab={slot.isLab}
                    sessionExists={slot.sessionExists}
                    isSelected={selectedSlot?.timetableId === slot.timetableId}
                    onClick={() => setSelectedSlot(slot)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Attendance sheet */}
          <div>
            {selectedSlot ? (
              <AttendanceSheet
                key={`${selectedSlot.timetableId}-${selectedDate}`}
                timetableEntryId={selectedSlot.timetableId}
                divisionId={selectedSlot.divisionId}
                date={selectedDate}
                subjectName={selectedSlot.subjectName}
                existingSessionId={selectedSlot.sessionId}
              />
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-divider py-16 text-sm text-muted-foreground">
                ← Select a lecture to mark attendance
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
