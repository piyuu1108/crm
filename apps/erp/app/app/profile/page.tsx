"use client";

import React from "react";
import { Spinner } from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useIsFacultyLike } from "@/app/lib/hooks/use-permission";
import { ProfileStepper as StudentProfileStepper } from "./_components/profile-stepper";
import { FacultyProfileStepper } from "./_components/faculty-profile-stepper";

export default function ProfilePage() {
  const { user, isHydrated } = useAuthStore();
  const isFacultyRole = useIsFacultyLike();

  if (!isHydrated || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isFacultyRole) {
    return <FacultyProfileStepper />;
  }

  return <StudentProfileStepper />;
}
