"use client";

import React from "react";
import { Button } from "@heroui/react";
import { CircleCheck, CircleXmark } from "@gravity-ui/icons";

interface BulkActionsBarProps {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
}

export function BulkActionsBar({
  totalStudents,
  presentCount,
  absentCount,
  onMarkAllPresent,
  onMarkAllAbsent,
}: BulkActionsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-divider bg-content1 px-4 py-3">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Total: <strong className="text-foreground">{totalStudents}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <CircleCheck className="size-4" />
          <strong>{presentCount}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-red-500">
          <CircleXmark className="size-4" />
          <strong>{absentCount}</strong>
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={onMarkAllPresent}
          className="gap-1.5"
        >
          <CircleCheck className="size-4" />
          Mark All Present
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onPress={onMarkAllAbsent}
          className="gap-1.5"
        >
          <CircleXmark className="size-4" />
          Mark All Absent
        </Button>
      </div>
    </div>
  );
}
