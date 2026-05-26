"use client";

import React from "react";
import { Chip } from "@heroui/react";
import { Calendar, ShieldAlert } from "lucide-react";
import type { TimetableEntry } from "@/app/lib/queries/dashboard";

interface TimetableTodayProps {
  entries: TimetableEntry[];
  emptyMessage?: string;
}

function formatTime(t: string) {
  if (!t) return "";
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
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-divider rounded-2xl bg-default-50/50 min-h-[200px]">
        <Calendar className="w-8 h-8 text-default-400 mb-2 animate-pulse" />
        <span className="text-sm font-medium text-default-500">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => {
        const isProxy = entry.isProxy;
        const isProxiedOut = entry.isProxiedOut;
        
        let cardBg = "bg-default-50 hover:bg-default-100 border-divider";
        let statusBadge = null;
        let subtext = `${entry.facultyName} · ${entry.divisionName}`;
        let sideIndicator = "bg-primary";

        if (isProxiedOut) {
          cardBg = "bg-warning-50/10 dark:bg-warning-950/5 border-dashed border-warning-200 hover:border-warning-300 opacity-90 hover:opacity-100";
          sideIndicator = "bg-warning";
          statusBadge = (
            <Chip size="sm" color="warning" variant="soft" className="h-6">
              <Chip.Label>
                {entry.proxyStatus === "approved" ? "Proxied Out" : "Proxy Pending"}
              </Chip.Label>
            </Chip>
          );
          subtext = `Taken by ${entry.proxyFacultyName ?? "TBD"} (Proxy) · ${entry.divisionName}`;
        } else if (isProxy) {
          cardBg = "bg-success-50/10 dark:bg-success-950/5 border-success-200 hover:border-success-300";
          sideIndicator = "bg-success";
          statusBadge = (
            <Chip size="sm" color="success" variant="soft" className="h-6">
              <Chip.Label>
                {entry.proxyStatus === "approved" ? "Proxy Duty" : "Proxy Pending"}
              </Chip.Label>
            </Chip>
          );
          subtext = `Substituting for ${entry.originalFacultyName ?? "Faculty"} · ${entry.divisionName}`;
        }

        return (
          <div
            key={entry.id}
            className={`group relative flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 ${cardBg}`}
          >
            {/* Left accent line indicator */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${sideIndicator}`} />

            <div className="flex items-center gap-4 pl-2 min-w-0">
              {/* Time Section */}
              <div className="flex flex-col items-center justify-center w-24 shrink-0 px-2 py-1.5 rounded-xl bg-default-100 group-hover:bg-default-200/50 transition-colors">
                <span className="text-[11px] font-bold text-default-700 tracking-wide uppercase">
                  {formatTime(entry.startTime)}
                </span>
                <span className="text-[9px] font-medium text-default-400 mt-0.5">
                  {formatTime(entry.endTime)}
                </span>
              </div>

              {/* Subject Info */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold tracking-tight text-foreground truncate ${isProxiedOut ? "line-through text-default-400" : ""}`}>
                    {entry.subjectName}
                  </span>
                </div>
                <span className="text-xs text-default-500 font-medium truncate flex items-center gap-1">
                  {isProxy && <ShieldAlert className="w-3.5 h-3.5 text-success shrink-0" />}
                  {subtext}
                </span>
              </div>
            </div>

            {/* Status / Badge Section */}
            {statusBadge && (
              <div className="shrink-0 flex items-center gap-2 pr-1">
                {statusBadge}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
