"use client";

import React from "react";
import { Spinner } from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { FacultyAttendanceView } from "./components/faculty-view";
import { CounselorHodView } from "./components/counselor-hod-view";
import { StudentSelfView } from "./components/student-self-view";

export default function AttendancePage() {
  const { activeRole, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  switch (activeRole) {
    case "faculty":
      return <FacultyAttendanceView />;
    case "counselor":
      return <CounselorHodView role="counselor" />;
    case "hod":
      return <CounselorHodView role="hod" />;
    case "student":
      return <StudentSelfView />;
    default:
      return (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Attendance is not available for your current role.
        </div>
      );
  }
}
