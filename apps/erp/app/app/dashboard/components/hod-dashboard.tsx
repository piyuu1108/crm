"use client";

import React from "react";
import { Card, Chip } from "@heroui/react";
import { Persons, ListCheck, SquareChartBar, Calendar } from "@gravity-ui/icons";
import { KpiCard } from "./kpi-card";
import { RequestList } from "./request-list";
import type { HodDashboardData } from "@/app/lib/queries/dashboard";

interface HodDashboardProps {
  data: HodDashboardData;
}

export function HodDashboard({ data }: HodDashboardProps) {
  const {
    totalStudents,
    activeStudents,
    totalFaculty,
    pendingRequestsCount,
    pendingRequests,
  } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">HOD Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of academic operations across all batches and semesters
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total Students"
          value={totalStudents}
          sublabel={`${activeStudents} active`}
          icon={<Persons />}
          color="accent"
        />
        <KpiCard
          label="Total Faculty"
          value={totalFaculty}
          icon={<Persons />}
          color="default"
        />
        <KpiCard
          label="Pending Requests"
          value={pendingRequestsCount}
          icon={<ListCheck />}
          color={pendingRequestsCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* System Overview + Pending Requests */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* System summary */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
          <Card className="border border-divider">
            <Card.Header className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <SquareChartBar className="size-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  System Overview
                </span>
              </div>
            </Card.Header>
            <Card.Content className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-divider p-4 text-center">
                  <div className="text-3xl font-bold text-accent">
                    {totalStudents}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Total Students
                  </div>
                </div>
                <div className="rounded-xl border border-divider p-4 text-center">
                  <div className="text-3xl font-bold text-success">
                    {activeStudents}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Active Students
                  </div>
                </div>
                <div className="rounded-xl border border-divider p-4 text-center">
                  <div className="text-3xl font-bold text-foreground">
                    {totalFaculty}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Faculty Members
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Pending Requests sidebar */}
        <Card className="col-span-1 border border-divider">
          <Card.Header className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <ListCheck className="size-4 text-warning" />
              <span className="text-sm font-semibold text-foreground">
                Pending Approvals
              </span>
            </div>
          </Card.Header>
          <Card.Content className="px-5 pb-5">
            <RequestList
              requests={pendingRequests}
              emptyMessage="All caught up — no pending requests"
            />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
