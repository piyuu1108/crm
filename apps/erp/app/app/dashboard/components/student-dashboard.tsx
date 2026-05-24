"use client";

import { Tabs, Button, toast } from "@heroui/react";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { StatCard } from "./stat-card";
import type { StudentDashboardData } from "@/app/lib/queries/dashboard";

const StudentsChart = dynamic(() => import("./students-chart").then(m => ({ default: m.StudentsChart })), { ssr: false });
const AttendanceChart = dynamic(() => import("./attendance-chart").then(m => ({ default: m.AttendanceChart })), { ssr: false });

interface StudentDashboardProps {
  data: StudentDashboardData;
}

export function StudentDashboard({ data }: StudentDashboardProps) {
  const { attendance } = data;

  return (
    <>
      {/* Tabs row + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs defaultSelectedKey="overview">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Dashboard tabs">
              <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="faculties">Faculties<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="students">Students<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onPress={() => toast.info("This feature will be added.")}>Download</Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={String(attendance.presentCount)} trend="3.3%" trendDirection="up" />
        <StatCard title="Total Classes" value={String(attendance.totalSessions)} trend="3.3%" trendDirection="up" />
        <StatCard title="Total Faculties" value="—" trend="0%" trendDirection="up" />
        <StatCard title="Total Subjects" value="—" trend="0%" trendDirection="up" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StudentsChart />
        <AttendanceChart />
      </div>
    </>
  );
}
