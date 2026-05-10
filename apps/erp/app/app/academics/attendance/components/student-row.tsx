"use client";

import React from "react";
import { CircleCheck, CircleXmark } from "@gravity-ui/icons";

interface StudentRowProps {
  studentId: number;
  fullName: string;
  rollId: string | null;
  status: "present" | "absent";
  isChanged: boolean;
  onToggle: (studentId: number) => void;
}

export function StudentRow({
  studentId,
  fullName,
  rollId,
  status,
  isChanged,
  onToggle,
}: StudentRowProps) {
  const isPresent = status === "present";

  return (
    <button
      type="button"
      onClick={() => onToggle(studentId)}
      className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isPresent
          ? "bg-emerald-500/10 hover:bg-emerald-500/15"
          : "bg-red-500/10 hover:bg-red-500/15"
      } ${isChanged ? "ring-1 ring-amber-400/50" : ""}`}
      aria-label={`${fullName} — ${isPresent ? "Present" : "Absent"}. Click to toggle.`}
    >
      {/* Status icon */}
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
          isPresent
            ? "bg-emerald-500/20 text-emerald-600"
            : "bg-red-500/20 text-red-500"
        }`}
      >
        {isPresent ? (
          <CircleCheck className="size-5" />
        ) : (
          <CircleXmark className="size-5" />
        )}
      </div>

      {/* Student info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {fullName}
        </span>
        {rollId && (
          <span className="truncate text-xs text-muted-foreground">{rollId}</span>
        )}
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          isPresent
            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
            : "bg-red-500/20 text-red-700 dark:text-red-400"
        }`}
      >
        {isPresent ? "Present" : "Absent"}
      </span>

      {/* Change indicator */}
      {isChanged && (
        <span className="size-2 shrink-0 rounded-full bg-amber-400" title="Unsaved change" />
      )}
    </button>
  );
}
