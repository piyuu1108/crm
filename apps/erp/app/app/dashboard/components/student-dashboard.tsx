"use client";

import React from "react";
import { Card } from "@heroui/react";
import {
  Person,
  Calendar,
  ListCheck,
  ChartColumn,
} from "@gravity-ui/icons";
import { KpiCard } from "./kpi-card";
import { RequestList } from "./request-list";
import { TimetableToday } from "./timetable-today";
import { ProfileStatusCard } from "./profile-status-card";
import type { StudentDashboardData } from "@/app/lib/queries/dashboard";

interface StudentDashboardProps {
  data: StudentDashboardData;
}

export function StudentDashboard({ data }: StudentDashboardProps) {
  const { profile, attendance, pendingRequestsCount, todayTimetable, recentRequests } = data;

  // Attendance color coding per SRS: track % and warn if low
  const attColor =
    attendance.percentage >= 75
      ? "success"
      : attendance.percentage >= 60
      ? "warning"
      : "danger";

  return (
    <div className="flex flex-col gap-s7">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.divisionName
            ? `${profile.divisionName} · Semester ${profile.currentSemesterNo}`
            : "Welcome back"}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-s6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Attendance"
          value={`${attendance.percentage}%`}
          sublabel={`${attendance.presentCount} / ${attendance.totalSessions} sessions`}
          icon={<ChartColumn />}
          color={attColor}
        />
        <KpiCard
          label="Division"
          value={profile?.divisionName ?? "—"}
          sublabel={`Semester ${profile?.currentSemesterNo ?? "—"}`}
          icon={<Person />}
          color="accent"
        />
        <KpiCard
          label="Student ID"
          value={profile?.studentId ?? "Pending"}
          icon={<ListCheck />}
          color="default"
        />
        <KpiCard
          label="Pending Requests"
          value={pendingRequestsCount}
          icon={<ListCheck />}
          color={pendingRequestsCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Middle + Right */}
      <div className="grid grid-cols-1 gap-s7 lg:grid-cols-3">
        {/* Today's Timetable — 2 cols */}
        <Card className="col-span-1 lg:col-span-2 border border-border bg-surface shadow-s1 rounded-rsm">
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

        <div className="col-span-1 flex flex-col gap-s6">
          <ProfileStatusCard
            profileStatus={profile?.profileStatus}
            profileStep={profile?.profileStep}
            verificationStatus={profile?.status}
          />

          {/* Recent Requests */}
          <Card className="border border-border bg-surface shadow-s1 rounded-rsm">
            <Card.Header className="px-s6 pt-s6 pb-s3">
              <div className="flex items-center gap-s3">
                <ListCheck className="size-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">
                  My Requests
                </span>
              </div>
            </Card.Header>
            <Card.Content className="px-s6 pb-s6">
              <RequestList
                requests={recentRequests}
                emptyMessage="No requests submitted yet"
              />
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
