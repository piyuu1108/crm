"use client";

import React from "react";
import { Spinner } from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { ProfileStepper as StudentProfileStepper } from "./_components/profile-stepper";
import { FacultyProfileStepper } from "./_components/faculty-profile-stepper";

export default function ProfilePage() {
  const { user, activeRole, isHydrated } = useAuthStore();

  if (!isHydrated || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isFacultyRole =
    activeRole === "faculty" ||
    activeRole === "counselor" ||
    activeRole === "hod" ||
    activeRole === "principal" ||
    activeRole === "vice_principal" ||
    (!activeRole &&
      user.roles.some(
        (role) =>
          role === "faculty" ||
          role === "counselor" ||
          role === "hod" ||
          role === "principal" ||
          role === "vice_principal"
      ));

  if (isFacultyRole) {
    return <FacultyProfileStepper />;
  }

  return <StudentProfileStepper />;
}
