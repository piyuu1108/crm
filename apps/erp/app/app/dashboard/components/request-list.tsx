"use client";

import React from "react";
import { Chip } from "@heroui/react";
import type { StudentRequest } from "@/app/lib/queries/dashboard";

const STATUS_COLOR = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  high: "danger",
  medium: "warning",
  low: "default",
} as const satisfies Record<string, "warning" | "success" | "danger" | "default">;

const REQUEST_TYPE_LABEL: Record<string, string> = {
  leave: "Leave Request",
  bonafide: "Bonafide Certificate",
  id_issue: "ID Card Issue",
  late_entry: "Late Entry",
  student_application: "Student Application",
  leave_request: "Leave Request",
  approval: "Approval Notice",
  timetable_change: "Schedule Update",
  assignment_update: "Assignment Alert",
  fee_event: "Fee Alert",
  counselor_action: "Counseling Update",
  admin_action: "Admin Update",
  system_alert: "System Alert",
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
          className="flex flex-col gap-1 py-3"
        >
          <span className="text-sm font-semibold text-foreground">
            {REQUEST_TYPE_LABEL[req.requestType] ?? req.requestType}
          </span>
          <span className="text-xs text-muted-foreground break-words leading-relaxed">
            {req.studentName}
          </span>
          <span className="text-[10px] text-muted-foreground/80 mt-0.5">
            {new Date(req.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
