"use client";

import { Tabs, Button, toast, Chip, Card } from "@heroui/react";
import dynamic from "next/dynamic";
import { StatCard } from "./stat-card";
import { TimetableToday } from "./timetable-today";
import { RequestList } from "./request-list";
import type { FacultyDashboardData } from "@/app/lib/queries/dashboard";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const StudentsChart = dynamic(() => import("./students-chart").then(m => ({ default: m.StudentsChart })), { ssr: false });
const AttendanceChart = dynamic(() => import("./attendance-chart").then(m => ({ default: m.AttendanceChart })), { ssr: false });

interface FacultyDashboardProps {
  data: FacultyDashboardData;
}

export function FacultyDashboard({ data }: FacultyDashboardProps) {
  const {
    assignedSubjectsCount,
    assignedDivisionsCount,
    todayTimetable,
  } = data;

  const { user, activeRole } = useAuthStore();

  // Real-time unread notifications from Convex
  const recentUnread = useQuery(
    api.notifications.getRecentUnread,
    user ? { receiverUserId: user.id } : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    user ? { receiverUserId: user.id } : "skip"
  ) ?? 0;

  // Map Convex notifications to the format RequestList expects
  const pendingRequests = (recentUnread ?? []).map((n) => ({
    id: 0, // Not used for rendering
    requestType: n.notificationType,
    subject: n.title,
    status: n.priority,
    studentName: n.message,
    divisionName: "",
    createdAt: new Date(n._creationTime).toISOString(),
  }));

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
        <StatCard title="Assigned Subjects" value={String(assignedSubjectsCount)} trend="0%" trendDirection="up" />
        <StatCard title="Assigned Divisions" value={String(assignedDivisionsCount)} trend="0%" trendDirection="up" />
        <StatCard title="Today's Classes" value={String(todayTimetable?.length ?? 0)} trend="Active" trendDirection="up" />
        <StatCard title="Unread Notifications" value={String(unreadCount)} trend="Inbox" trendDirection="up" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StudentsChart />
        <AttendanceChart />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Column (2 cols wide): Today's Schedule */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Today's Schedule</span>
              <Chip size="sm" variant="soft" color="accent" className="h-5">
                <Chip.Label>
                  {todayTimetable?.length ?? 0} {todayTimetable?.length === 1 ? "Session" : "Sessions"}
                </Chip.Label>
              </Chip>
            </h3>
          </div>
          <Card className="rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-divider p-5 min-h-[250px]">
            <TimetableToday entries={todayTimetable} emptyMessage="No lectures or proxy duties assigned for today" />
          </Card>
        </div>

        {/* Right Column (1 col wide): Unread Notifications */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Unread Notifications
          </h3>
          <Card className="rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-divider p-5 min-h-[250px] flex flex-col">
            <div className="flex-1 overflow-y-auto max-h-[350px] pr-1">
              <RequestList requests={pendingRequests} emptyMessage="No unread notifications!" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
