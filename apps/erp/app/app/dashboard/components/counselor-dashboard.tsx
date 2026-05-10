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
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Counselor Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Division oversight and student request management
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assigned Divisions list */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="border border-divider">
            <Card.Header className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <SquareChartBar className="size-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  Assigned Divisions
                </span>
              </div>
            </Card.Header>
            <Card.Content className="px-5 pb-5">
              {assignedDivisions.length === 0 ? (
                <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
                  No divisions assigned for current semester
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
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
        <Card className="col-span-1 border border-divider">
          <Card.Header className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <ListCheck className="size-4 text-warning" />
              <span className="text-sm font-semibold text-foreground">
                Pending Requests
              </span>
            </div>
          </Card.Header>
          <Card.Content className="px-5 pb-5">
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
