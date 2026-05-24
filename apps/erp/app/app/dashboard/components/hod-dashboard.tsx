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
    approvedStudents = 0,
    unapprovedStudents = 0,
    totalFaculty,
    pendingRequestsCount,
    pendingRequests,
  } = data;

  return (
    <div className="flex flex-col gap-s7">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">HOD Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of academic operations across all batches and semesters
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-s6 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total Students"
          value={totalStudents}
          sublabel={`${approvedStudents} approved · ${unapprovedStudents} unapproved`}
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
      <div className="grid grid-cols-1 gap-s7 lg:grid-cols-3">
        {/* System summary */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-s6">
          <Card className="border border-border bg-surface shadow-s1 rounded-rsm">
            <Card.Header className="px-s6 pt-s6 pb-s3">
              <div className="flex items-center gap-s3">
                <SquareChartBar className="size-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  System Overview
                </span>
              </div>
            </Card.Header>
            <Card.Content className="px-s6 pb-s6">
              <div className="grid grid-cols-2 gap-s5 sm:grid-cols-4">
                <div className="rounded-rxs border border-border bg-default/20 p-s6 text-center">
                  <div className="text-3xl font-bold text-accent">
                    {totalStudents}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Total Students
                  </div>
                </div>
                <div className="rounded-rxs border border-border bg-default/20 p-s6 text-center">
                  <div className="text-3xl font-bold text-success">
                    {approvedStudents}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Approved Profiles
                  </div>
                </div>
                <div className="rounded-rxs border border-border bg-default/20 p-s6 text-center">
                  <div className="text-3xl font-bold text-warning">
                    {unapprovedStudents}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Unapproved Profiles
                  </div>
                </div>
                <div className="rounded-rxs border border-border bg-default/20 p-s6 text-center">
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
        <Card className="col-span-1 border border-border bg-surface shadow-s1 rounded-rsm">
          <Card.Header className="px-s6 pt-s6 pb-s3">
            <div className="flex items-center gap-s3">
              <ListCheck className="size-4 text-warning" />
              <span className="text-sm font-semibold text-foreground">
                Pending Approvals
              </span>
            </div>
          </Card.Header>
          <Card.Content className="px-s6 pb-s6">
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
