"use client";

import React from "react";
import { Clock, BookOpen } from "@gravity-ui/icons";

interface LectureSlotCardProps {
  subjectName: string;
  divisionName: string;
  startTime: string;
  endTime: string;
  isLab: boolean;
  sessionExists: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function LectureSlotCard({
  subjectName,
  divisionName,
  startTime,
  endTime,
  isLab,
  sessionExists,
  isSelected,
  onClick,
}: LectureSlotCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-col gap-2 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isSelected
          ? "border-accent bg-white shadow-md ring-1 ring-accent/30"
          : "border-divider bg-white hover:border-accent/50 hover:shadow-sm"
      }`}
    >
      {/* Session badge */}
      {sessionExists && (
        <span className="absolute right-3 top-3 flex size-2.5 rounded-full bg-emerald-500" title="Attendance marked" />
      )}

      {/* Subject + lab */}
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 shrink-0 text-accent" />
        <span className="truncate text-sm font-semibold text-foreground">
          {subjectName}
        </span>
        {isLab && (
          <span className="shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
            LAB
          </span>
        )}
      </div>

      {/* Division + time */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{divisionName}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatTime(startTime)} – {formatTime(endTime)}
        </span>
      </div>
    </button>
  );
}
