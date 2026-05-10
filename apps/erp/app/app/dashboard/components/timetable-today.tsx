"use client";

import React from "react";
import { Chip } from "@heroui/react";
import type { TimetableEntry } from "@/app/lib/queries/dashboard";

interface TimetableTodayProps {
  entries: TimetableEntry[];
  emptyMessage?: string;
}

function formatTime(t: string) {
  // t is "HH:MM:SS" or "HH:MM"
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function TimetableToday({
  entries,
  emptyMessage = "No classes scheduled today",
}: TimetableTodayProps) {
  if (entries.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-lg border border-divider bg-background p-3"
        >
          {/* Time column */}
          <div className="w-24 shrink-0 text-center">
            <div className="text-xs font-semibold text-accent">
              {formatTime(entry.startTime)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {formatTime(entry.endTime)}
            </div>
          </div>

          {/* Separator */}
          <div className="h-8 w-px bg-divider" />

          {/* Subject info */}
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {entry.subjectName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {entry.facultyName} · {entry.divisionName}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
