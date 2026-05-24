"use client";

import { Card, Chip, Select, ListBox } from "@heroui/react";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const data = [
  { day: "Mon", total: 120, approved: 95 },
  { day: "Tue", total: 135, approved: 110 },
  { day: "Wed", total: 108, approved: 85 },
  { day: "Thu", total: 142, approved: 120 },
  { day: "Fri", total: 128, approved: 100 },
  { day: "Sat", total: 90, approved: 75 },
  { day: "Sun", total: 65, approved: 50 },
];

interface MiniStatProps {
  value: string;
  trend: string;
  label: string;
}

function MiniStat({ value, trend, label }: MiniStatProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {value}
        </span>
        <Chip size="sm" color="success" variant="soft" className="bg-transparent">
          <TrendingUp className="size-3" />
          <Chip.Label>{trend}</Chip.Label>
        </Chip>
      </div>
      <span className="text-xs text-default-400">{label}</span>
    </div>
  );
}

export function StudentsChart() {
  return (
    <Card className="rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <h3 className="text-base font-semibold text-foreground">
          Students Overview
        </h3>
        <Select
          variant="secondary"
          className="w-[140px]"
          defaultSelectedKey="last-2-weeks"
          aria-label="Time period"
          placeholder="Select period"
        >
          <Select.Trigger className="h-auto min-h-0 px-3 py-1.5 text-xs">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="last-week" textValue="Last week">
                Last week
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="last-2-weeks" textValue="Last 2 weeks">
                Last 2 weeks
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="last-month" textValue="Last month">
                Last month
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="px-3 pb-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
          <MiniStat value="1,248" trend="3.3%" label="Total Students" />
          <MiniStat value="1,102" trend="2.1%" label="Approved" />
          <MiniStat value="146" trend="1.2%" label="Pending" />
        </div>

        <div className="w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} barSize={16}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e4e4e7"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#a1a1aa" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#a1a1aa" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  fontSize: 13,
                }}
              />
              <Bar
                dataKey="total"
                name="Total Students"
                fill="#006FEE"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="approved"
                name="Approved"
                fill="#7dd3fc"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
