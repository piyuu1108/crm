"use client";

import React from "react";
import { Card } from "@heroui/react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  /** Optional sub-label below the value */
  sublabel?: string;
  /** Color accent: accent | success | warning | danger | default */
  color?: "accent" | "success" | "warning" | "danger" | "default";
}

const colorMap: Record<NonNullable<KpiCardProps["color"]>, string> = {
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  default: "bg-default/10 text-foreground",
};

export function KpiCard({
  label,
  value,
  icon,
  sublabel,
  color = "default",
}: KpiCardProps) {
  return (
    <Card className="p-s6 flex flex-row items-center gap-s5 border border-border bg-surface shadow-s1 rounded-rsm">
      <div
        className={`flex size-12 shrink-0 items-center justify-center rounded-rxs text-xl ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="text-2xl font-bold text-foreground leading-tight">
          {value}
        </span>
        {sublabel && (
          <span className="text-xs text-muted-foreground mt-0.5 truncate">
            {sublabel}
          </span>
        )}
      </div>
    </Card>
  );
}
