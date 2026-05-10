"use client";

import React, { useState, useMemo } from "react";
import { Alert, Spinner } from "@heroui/react";
import { CircleCheck, CircleXmark, ChartColumn } from "@gravity-ui/icons";
import { AttendanceFilters } from "./attendance-filters";
import { useMyAttendanceQuery } from "@/app/lib/queries/attendance";

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function StudentSelfView() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const query = useMyAttendanceQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    subject: subjectFilter || undefined,
  });

  const records = query.data?.records ?? [];
  const subjects = query.data?.subjects ?? [];
  const summary = query.data?.summary ?? { total: 0, present: 0, absent: 0, percentage: 0 };

  // Group records by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof records>();
    for (const r of records) {
      const existing = groups.get(r.date) ?? [];
      existing.push(r);
      groups.set(r.date, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [records]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">My Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your attendance records across all subjects.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl border border-divider bg-content1 px-4 py-3">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-foreground">{summary.total}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-divider bg-content1 px-4 py-3">
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CircleCheck className="size-3" /> Present
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.present}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-divider bg-content1 px-4 py-3">
          <span className="flex items-center gap-1 text-xs text-red-500">
            <CircleXmark className="size-3" /> Absent
          </span>
          <span className="text-2xl font-bold text-red-500">{summary.absent}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-divider bg-content1 px-4 py-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChartColumn className="size-3" /> Percentage
          </span>
          <span
            className={`text-2xl font-bold ${
              summary.percentage >= 75
                ? "text-emerald-600 dark:text-emerald-400"
                : summary.percentage >= 50
                  ? "text-amber-500"
                  : "text-red-500"
            }`}
          >
            {summary.percentage}%
          </span>
        </div>
      </div>

      {/* Filters */}
      <AttendanceFilters
        date=""
        onDateChange={() => {}}
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        subjects={subjects}
        selectedSubject={subjectFilter}
        onSubjectChange={setSubjectFilter}
      />

      {/* Loading */}
      {query.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error */}
      {query.isError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load attendance</Alert.Title>
            <Alert.Description>{query.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Records grouped by date */}
      {query.isSuccess && (
        <div className="flex flex-col gap-4">
          {groupedByDate.length === 0 ? (
            <div className="rounded-xl border border-dashed border-divider py-8 text-center text-sm text-muted-foreground">
              No attendance records found.
            </div>
          ) : (
            groupedByDate.map(([date, dayRecords]) => (
              <div key={date} className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {formatDate(date)}
                </h3>
                <div className="flex flex-col gap-1">
                  {dayRecords.map((record) => {
                    const isPresent = record.status === "present";
                    return (
                      <div
                        key={record.id}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
                          isPresent
                            ? "bg-emerald-500/10"
                            : "bg-red-500/10"
                        }`}
                      >
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                            isPresent
                              ? "bg-emerald-500/20 text-emerald-600"
                              : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {isPresent ? (
                            <CircleCheck className="size-4" />
                          ) : (
                            <CircleXmark className="size-4" />
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">
                            {record.subjectName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {record.facultyName} · {formatTime(record.startTime)} – {formatTime(record.endTime)}
                          </span>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isPresent
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-500/20 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {isPresent ? "Present" : "Absent"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
