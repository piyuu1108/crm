"use client";

import React, { useState } from "react";
import { Tabs, Button, toast, Card } from "@heroui/react";
import { Download, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { StatCard } from "./stat-card";
import type { HodDashboardData } from "@/app/lib/queries/dashboard";
import { EmployeeTable } from "@/components/employee-table";

const StudentsChart = dynamic(() => import("./students-chart").then(m => ({ default: m.StudentsChart })), { ssr: false });
const AttendanceChart = dynamic(() => import("./attendance-chart").then(m => ({ default: m.AttendanceChart })), { ssr: false });

interface HodDashboardProps {
  data: HodDashboardData;
}

export function HodDashboard({ data }: HodDashboardProps) {
  const {
    totalStudents,
    totalFaculty,
  } = data;

  const [activeTab, setActiveTab] = useState<string>("overview");

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs row + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))}>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Dashboard tabs">
              <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="faculties">Faculties<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="students">Students<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Button isIconOnly size="sm" variant="tertiary" aria-label="Refresh" onPress={() => window.location.reload()}>
            <RefreshCw className="size-4" />
          </Button>
          <Button size="sm" onPress={() => toast.info("This feature will be added.")}>Download</Button>
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Students" value={String(totalStudents)} trend="3.3%" trendDirection="up" />
            <StatCard title="Total Classes" value="24" trend="3.3%" trendDirection="up" />
            <StatCard title="Total Faculties" value={String(totalFaculty)} trend="3.3%" trendDirection="up" />
            <StatCard title="Total Subjects" value="48" trend="4.1%" trendDirection="up" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <StudentsChart />
            <AttendanceChart />
          </div>
          <EmployeeTable />
        </>
      )}

      {activeTab === "faculties" && (
        <EmployeeTable />
      )}

      {activeTab === "students" && (
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-4xl">👨‍🎓</div>
            <p className="text-sm text-muted-foreground">
              Students directory can be managed under Academics section or will be added to the dashboard shortly.
            </p>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}

