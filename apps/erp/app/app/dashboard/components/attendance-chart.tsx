"use client";

import { Card, Button } from "@heroui/react";
import { MoreVertical } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const data = [
  { month: "Jan", beforeBreak: 82, afterBreak: 75 },
  { month: "Feb", beforeBreak: 85, afterBreak: 78 },
  { month: "Mar", beforeBreak: 80, afterBreak: 72 },
  { month: "Apr", beforeBreak: 88, afterBreak: 80 },
  { month: "May", beforeBreak: 86, afterBreak: 76 },
  { month: "Jun", beforeBreak: 83, afterBreak: 74 },
  { month: "Jul", beforeBreak: 90, afterBreak: 82 },
  { month: "Aug", beforeBreak: 87, afterBreak: 79 },
  { month: "Sep", beforeBreak: 92, afterBreak: 84 },
  { month: "Oct", beforeBreak: 85, afterBreak: 78 },
  { month: "Nov", beforeBreak: 88, afterBreak: 81 },
  { month: "Dec", beforeBreak: 84, afterBreak: 76 },
];

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="size-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-default-400">{label}</span>
    </div>
  );
}

export function AttendanceChart() {
  return (
    <Card className="rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <h3 className="text-base font-semibold text-foreground">
          Attendance Trends
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <LegendDot color="#338ef7" label="Before Break" />
            <LegendDot color="#7dd3fc" label="After Break" />
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label="More options"
          >
            <MoreVertical className="size-4" />
          </Button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="mb-3">
          <span className="text-lg font-semibold tabular-nums text-foreground">
            84.2%
          </span>
          <span className="text-xs text-default-400 ml-1">Avg Attendance</span>
        </div>

        <div className="w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e4e4e7"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#a1a1aa" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#a1a1aa" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${v / 1000}k` : `${v}`
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="beforeBreak"
                name="Before Break"
                stroke="#338ef7"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="afterBreak"
                name="After Break"
                stroke="#7dd3fc"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
