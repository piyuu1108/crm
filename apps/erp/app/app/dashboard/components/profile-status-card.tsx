"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, Button, ProgressBar, Chip } from "@heroui/react";
import { Person, CircleCheck, CircleXmark } from "@gravity-ui/icons";

interface ProfileStatusCardProps {
  profileStatus: string | null | undefined;
  profileStep: number | null | undefined;
  verificationStatus: string | null | undefined;
}

function normalizeStatus(profileStatus: string | null | undefined) {
  if (profileStatus === "complete" || profileStatus === "completed") {
    return "completed" as const;
  }
  return "incomplete" as const;
}

export function ProfileStatusCard({
  profileStatus,
  profileStep,
  verificationStatus,
}: ProfileStatusCardProps) {
  const router = useRouter();
  const normalizedStatus = normalizeStatus(profileStatus);
  const isCompleted = normalizedStatus === "completed";
  const safeStep = Math.min(Math.max(profileStep ?? 1, 1), 5);
  const progressPercent = isCompleted ? 100 : Math.round((safeStep / 5) * 100);
  const ctaLabel = isCompleted ? "View Profile" : "Complete Profile";
  const verificationLabel =
    verificationStatus === "approved" || verificationStatus === "active"
      ? "Approved"
      : verificationStatus === "rejected"
      ? "Rejected"
      : verificationStatus === "pending"
      ? "Pending Review"
      : "Incomplete";
  const verificationColor =
    verificationStatus === "approved" || verificationStatus === "active"
      ? "success"
      : verificationStatus === "rejected"
      ? "danger"
      : verificationStatus === "pending"
      ? "warning"
      : "default";

  return (
    <Card className="col-span-1 border border-divider">
      <Card.Header className="px-5 pt-5 pb-3">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Person className="size-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Profile Status</span>
          </div>
          <Chip
            color={isCompleted ? "success" : "warning"}
            variant="soft"
            size="sm"
            className="capitalize"
          >
            {isCompleted ? (
              <CircleCheck className="size-3.5" />
            ) : (
              <CircleXmark className="size-3.5" />
            )}
            <Chip.Label>
              {isCompleted ? "Completed" : "Incomplete"}
            </Chip.Label>
          </Chip>
        </div>
      </Card.Header>

      <Card.Content className="space-y-4 px-5 pb-5">
        <div className="flex items-center justify-between rounded-lg border border-divider px-3 py-2">
          <span className="text-xs text-muted-foreground">Verification</span>
          <Chip size="sm" variant="soft" color={verificationColor}>
            <Chip.Label>{verificationLabel}</Chip.Label>
          </Chip>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-accent">{progressPercent}%</span>
          </div>
          <ProgressBar value={progressPercent} aria-label="Profile completion progress">
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <p className="text-xs text-muted-foreground">Status: {isCompleted ? "Completed" : "Incomplete"}</p>
        </div>

        <Button variant={isCompleted ? "secondary" : "outline"} onPress={() => router.push("/app/profile")}>
          {ctaLabel}
        </Button>
      </Card.Content>
    </Card>
  );
}
