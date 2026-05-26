"use client";

import React from "react";
import { Calendar, Funnel } from "@gravity-ui/icons";
import { Select, ListBox } from "@heroui/react";

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
                className="rounded-lg border border-[var(--border)] bg-[var(--field-background)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
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
                className="rounded-lg border border-[var(--border)] bg-[var(--field-background)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
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
              className="rounded-lg border border-[var(--border)] bg-[var(--field-background)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      )}

      {/* Subject filter */}
      {subjects && subjects.length > 0 && onSubjectChange && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <Select
            className="min-w-[200px]"
            placeholder="All Subjects"
            selectedKey={selectedSubject || "all-subjects"}
            onSelectionChange={(key) => onSubjectChange(key === "all-subjects" ? "" : String(key))}
          >
            <Select.Trigger className="bg-[var(--field-background)] border border-[var(--border)] hover:border-accent/40 rounded-lg py-2 px-3 text-sm text-[var(--foreground)] flex items-center justify-between shadow-sm min-h-[38px] w-full">
              <div className="flex items-center gap-2">
                <Funnel className="size-4 text-muted-foreground shrink-0" />
                <Select.Value className="text-sm font-medium text-[var(--foreground)]" />
              </div>
              <Select.Indicator className="size-4 text-default-500" />
            </Select.Trigger>
            <Select.Popover>
              <ListBox className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-1 min-w-[200px] outline-none">
                <ListBox.Item id="all-subjects" textValue="All Subjects" className="text-sm text-[var(--foreground)] rounded-lg px-3 py-2 hover:bg-default-100 hover:text-foreground cursor-pointer flex items-center outline-none">
                  All Subjects
                </ListBox.Item>
                {subjects.map((s) => (
                  <ListBox.Item key={s} id={s} textValue={s} className="text-sm text-[var(--foreground)] rounded-lg px-3 py-2 hover:bg-default-100 hover:text-foreground cursor-pointer flex items-center outline-none">
                    {s}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      )}
    </div>
  );
}
