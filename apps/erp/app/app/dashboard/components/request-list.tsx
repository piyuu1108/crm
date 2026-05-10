"use client";

import React from "react";
import { Chip } from "@heroui/react";
import type { StudentRequest } from "@/app/lib/queries/dashboard";

const STATUS_COLOR = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
} as const satisfies Record<string, "warning" | "success" | "danger">;

const REQUEST_TYPE_LABEL: Record<string, string> = {
  leave: "Leave",
  bonafide: "Bonafide",
  id_issue: "ID Issue",
  late_entry: "Late Entry",
};

interface RequestListProps {
  requests: StudentRequest[];
  emptyMessage?: string;
}

export function RequestList({
  requests,
  emptyMessage = "No requests",
}: RequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-divider">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-start justify-between gap-3 py-3"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {req.subject}
            </span>
            <span className="text-xs text-muted-foreground">
              {req.studentName} · {req.divisionName}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(req.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Chip
              size="sm"
              color={STATUS_COLOR[req.status as keyof typeof STATUS_COLOR] ?? "default"}
              variant="soft"
            >
              <Chip.Label>{req.status}</Chip.Label>
            </Chip>
            <span className="text-xs text-muted-foreground">
              {REQUEST_TYPE_LABEL[req.requestType] ?? req.requestType}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
