"use client";

import React from "react";
import { Calendar, Funnel } from "@gravity-ui/icons";

interface AttendanceFiltersProps {
  date: string;
  onDateChange: (date: string) => void;
  subjects?: string[];
  selectedSubject?: string;
  onSubjectChange?: (subject: string) => void;
  /** Optional: show date range instead of single date */
  showDateRange?: boolean;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (date: string) => void;
  onDateToChange?: (date: string) => void;
}

export function AttendanceFilters({
  date,
  onDateChange,
  subjects,
  selectedSubject,
  onSubjectChange,
  showDateRange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: AttendanceFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Date filter */}
      {showDateRange ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={dateFrom ?? ""}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className="rounded-lg border border-divider bg-content1 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={dateTo ?? ""}
                onChange={(e) => onDateToChange?.(e.target.value)}
                className="rounded-lg border border-divider bg-content1 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="rounded-lg border border-divider bg-content1 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      )}

      {/* Subject filter */}
      {subjects && subjects.length > 0 && onSubjectChange && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <div className="relative">
            <Funnel className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={selectedSubject ?? ""}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="min-w-[180px] appearance-none rounded-lg border border-divider bg-content1 py-2 pl-9 pr-8 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
