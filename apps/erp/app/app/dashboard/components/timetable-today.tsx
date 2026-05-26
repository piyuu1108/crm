"use client";

import React from "react";
import { Chip } from "@heroui/react";
import { ShieldAlert } from "lucide-react";
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
        <span className="text-sm font-medium text-default-400">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {entries.map((entry) => {
        const isProxy = entry.isProxy;
        const isProxiedOut = entry.isProxiedOut;
        
        let cardStyles = "bg-background border-divider hover:bg-default-50/40 hover:border-default-300";
        let leftBar = null;
        let rightBadge = null;
        
        // Metadata text (No faculty name for regular lectures)
        let metadata = entry.divisionName;

        if (isProxiedOut) {
          cardStyles = "bg-default-50/20 border-dashed border-default-200 hover:bg-default-50/50 hover:border-default-300 opacity-90";
          rightBadge = (
            <Chip size="sm" color="warning" variant="soft" className="h-6">
              <Chip.Label>
                {entry.proxyStatus === "approved" ? "Proxied Out" : "Proxy Pending"}
              </Chip.Label>
            </Chip>
          );
          metadata = `Proxied to ${entry.proxyFacultyName ?? "TBD"} · ${entry.divisionName}`;
        } else if (isProxy) {
          cardStyles = "bg-background border-divider hover:bg-default-50/40 hover:border-default-300";
          leftBar = <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-success" />;
          rightBadge = (
            <Chip size="sm" color="success" variant="soft" className="h-6">
              <Chip.Label>Proxy Duty</Chip.Label>
            </Chip>
          );
          metadata = `Substituting for ${entry.originalFacultyName ?? "Faculty"} · ${entry.divisionName}`;
        }

        return (
          <div
            key={entry.id}
            className={`group relative flex items-center justify-between gap-4 rounded-xl border p-3.5 pl-4 transition-all duration-150 ${cardStyles}`}
          >
            {leftBar}

            <div className="flex items-center gap-6 min-w-0">
              {/* Time Column on Left */}
              <div className="w-16 shrink-0 flex flex-col items-center">
                <span className="text-xs font-bold text-foreground tracking-tight">
                  {formatTime(entry.startTime)}
                </span>
                <span className="text-[10px] text-default-400 font-medium mt-0.5">
                  {formatTime(entry.endTime)}
                </span>
              </div>

              {/* Subject + Metadata on Right */}
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-semibold tracking-tight text-foreground truncate ${isProxiedOut ? "line-through text-default-400" : ""}`}>
                  {entry.subjectName}
                </span>
                <span className="text-xs text-default-500 font-normal truncate flex items-center gap-1.5 mt-0.5">
                  {isProxy && <ShieldAlert className="w-3.5 h-3.5 text-success shrink-0" />}
                  {metadata}
                </span>
              </div>
            </div>

            {/* Optional Status Badge */}
            {rightBadge && (
              <div className="shrink-0 pr-1">
                {rightBadge}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
