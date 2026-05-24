"use client";

import React from "react";
import { Card, Chip } from "@heroui/react";
import { Persons, ListCheck, SquareChartBar } from "@gravity-ui/icons";
import { KpiCard } from "./kpi-card";
import { RequestList } from "./request-list";
import type { CounselorDashboardData } from "@/app/lib/queries/dashboard";

interface CounselorDashboardProps {
  data: CounselorDashboardData;
}

export function CounselorDashboard({ data }: CounselorDashboardProps) {
  const {
    assignedDivisions,
    pendingRequestsCount,
    totalStudentsCount,
    pendingRequests,
  } = data;

  return (
    <div className="flex flex-col gap-s7">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Counselor Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Division oversight and student request management
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-s6 sm:grid-cols-3">
        <KpiCard
          label="Assigned Divisions"
          value={assignedDivisions.length}
          icon={<SquareChartBar />}
          color="accent"
        />
        <KpiCard
          label="Students in Divisions"
          value={totalStudentsCount}
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

      {/* Divisions + Requests */}
      <div className="grid grid-cols-1 gap-s7 lg:grid-cols-3">
        {/* Assigned Divisions list */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="border border-border bg-surface shadow-s1 rounded-rsm">
            <Card.Header className="px-s6 pt-s6 pb-s3">
              <div className="flex items-center gap-s3">
                <SquareChartBar className="size-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  Assigned Divisions
                </span>
              </div>
            </Card.Header>
            <Card.Content className="px-s6 pb-s6">
              {assignedDivisions.length === 0 ? (
                <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
                  No divisions assigned for current semester
                </div>
              ) : (
                <div className="flex flex-wrap gap-s2">
                  {assignedDivisions.map((div) => (
                    <Chip key={div.id} color="accent" variant="soft" size="md">
                      <Chip.Label>{div.displayName}</Chip.Label>
                    </Chip>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Pending Requests */}
        <Card className="col-span-1 border border-border bg-surface shadow-s1 rounded-rsm">
          <Card.Header className="px-s6 pt-s6 pb-s3">
            <div className="flex items-center gap-s3">
              <ListCheck className="size-4 text-warning" />
              <span className="text-sm font-semibold text-foreground">
                Pending Requests
              </span>
            </div>
          </Card.Header>
          <Card.Content className="px-s6 pb-s6">
            <RequestList
              requests={pendingRequests}
              emptyMessage="No pending requests"
            />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
