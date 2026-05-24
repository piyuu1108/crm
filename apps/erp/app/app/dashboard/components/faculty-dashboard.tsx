"use client";

import React from "react";
import { Card } from "@heroui/react";
import {
  Book,
  Calendar,
  ListCheck,
  Persons,
} from "@gravity-ui/icons";
import { KpiCard } from "./kpi-card";
import { RequestList } from "./request-list";
import { TimetableToday } from "./timetable-today";
import type { FacultyDashboardData } from "@/app/lib/queries/dashboard";

interface FacultyDashboardProps {
  data: FacultyDashboardData;
}

export function FacultyDashboard({ data }: FacultyDashboardProps) {
  const {
    assignedSubjectsCount,
    assignedDivisionsCount,
    pendingRequestsCount,
    todayTimetable,
    assignments,
    pendingRequests,
  } = data;

  return (
    <div className="flex flex-col gap-s7">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your teaching assignments and pending actions
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-s6 sm:grid-cols-3">
        <KpiCard
          label="Assigned Subjects"
          value={assignedSubjectsCount}
          icon={<Book />}
          color="accent"
        />
        <KpiCard
          label="Divisions"
          value={assignedDivisionsCount}
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

      {/* Middle + Right layout */}
      <div className="grid grid-cols-1 gap-s7 lg:grid-cols-3">
        {/* Left: Today's schedule + assignment list */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-s7">
          {/* Today's Timetable */}
          <Card className="border border-border bg-surface shadow-s1 rounded-rsm">
            <Card.Header className="px-s6 pt-s6 pb-s3">
              <div className="flex items-center gap-s3">
                <Calendar className="size-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  Today&apos;s Schedule
                </span>
              </div>
            </Card.Header>
            <Card.Content className="px-s6 pb-s6">
              <TimetableToday entries={todayTimetable} />
            </Card.Content>
          </Card>

          {/* Subject Assignments */}
          <Card className="border border-border bg-surface shadow-s1 rounded-rsm">
            <Card.Header className="px-s6 pt-s6 pb-s3">
              <div className="flex items-center gap-s3">
                <Book className="size-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  Subject Assignments (Current Semester)
                </span>
              </div>
            </Card.Header>
            <Card.Content className="px-s6 pb-s6">
              {assignments.length === 0 ? (
                <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
                  No assignments for the current semester
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-s5 py-s3"
                    >
                      <div className="flex flex-col gap-s1">
                        <span className="text-sm font-medium text-foreground">
                          {a.subjectName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {a.divisionName} · {a.courseCode}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {a.subjectType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Right: Pending student requests */}
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
