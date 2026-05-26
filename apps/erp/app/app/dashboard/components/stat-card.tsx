"use client";

import { Card, Chip } from "@heroui/react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
}

export function StatCard({ title, value, trend, trendDirection }: StatCardProps) {
  return (
    <Card className="px-4 py-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <dt className="text-xs text-white">{title}</dt>
      <div className="flex items-center justify-between mt-1">
        <dd className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </dd>
        <Chip
          size="sm"
          color={trendDirection === "up" ? "success" : "danger"}
          variant="soft"
        >
          {trendDirection === "up" ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          <Chip.Label>{trend}</Chip.Label>
        </Chip>
      </div>
    </Card>
  );
}
