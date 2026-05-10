"use client";

import React from "react";
import { Spinner } from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { HodExamManagement } from "./components/hod-exam-management";
import { FacultyMarksEntry } from "./components/faculty-marks-entry";
import { CounselorMarksView } from "./components/counselor-marks-view";
import { StudentMarksView } from "./components/student-marks-view";

export default function InternalExamsPage() {
  const { activeRole, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  switch (activeRole) {
    case "hod":
      return <HodExamManagement />;
    case "faculty":
      return <FacultyMarksEntry />;
    case "counselor":
      return <CounselorMarksView />;
    case "student":
      return <StudentMarksView />;
    default:
      return (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Internal Exams is not available for your current role.
        </div>
      );
  }
}
