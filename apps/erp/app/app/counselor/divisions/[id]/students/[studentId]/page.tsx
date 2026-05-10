"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Chip, Spinner, toast } from "@heroui/react";
import { ArrowLeft } from "@gravity-ui/icons";
import {
  useCounselorStudentDetailQuery,
  useCounselorStudentVerificationMutation,
} from "@/app/lib/queries/counselor";

function statusChip(status: string): {
  label: string;
  color: "success" | "warning" | "danger" | "default";
} {
  if (status === "approved" || status === "active") {
    return { label: "Approved", color: "success" };
  }
  if (status === "rejected") return { label: "Rejected", color: "danger" };
  if (status === "pending") return { label: "Pending Review", color: "warning" };
  return { label: "Incomplete", color: "default" };
}

export default function CounselorStudentDetailPage() {
  const params = useParams<{ id: string; studentId: string }>();
  const router = useRouter();
  const divisionId = Number(params.id);
  const studentDbId = Number(params.studentId);

  const { data, isLoading, isError, error } =
    useCounselorStudentDetailQuery(studentDbId);
  const verifyMutation = useCounselorStudentVerificationMutation();

  const handleAction = async (action: "approve" | "reject") => {
    try {
      await verifyMutation.mutateAsync({ studentDbId, action });
      toast.success(action === "approve" ? "Profile approved" : "Profile rejected");
    } catch (e) {
      toast.danger("Action failed", {
        description: e instanceof Error ? e.message : "Please retry",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border border-danger/30 bg-danger/5 p-6">
        <Card.Content>
          <p className="text-sm text-danger">
            {error instanceof Error ? error.message : "Failed to load student details"}
          </p>
        </Card.Content>
      </Card>
    );
  }

  const current = statusChip(data.status);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onPress={() => router.push(`/app/counselor/divisions/${divisionId}`)}
        >
          <ArrowLeft className="size-4" />
          Back to Division
        </Button>
        <Chip color={current.color} variant="soft">
          {current.label}
        </Chip>
      </div>

      <Card className="border border-divider">
        <Card.Header className="px-5 pt-5 pb-2">
          <Card.Title>{data.fullName}</Card.Title>
          <Card.Description>{data.studentId ?? "No Student ID"}</Card.Description>
        </Card.Header>
        <Card.Content className="grid grid-cols-1 gap-3 px-5 pb-5 text-sm sm:grid-cols-2">
          <p>Email: {data.email}</p>
          <p>Mobile: {data.mobile ?? "—"}</p>
          <p>Parent Mobile: {data.parentMobile ?? "—"}</p>
          <p>Division: {data.currentDivisionName ?? "—"}</p>
          <p>Semester: {data.currentSemesterNo ?? "—"}</p>
          <p>Profile Completion: {data.profileStatus} (Step {data.profileStep}/5)</p>
        </Card.Content>
        <Card.Footer className="flex gap-2 px-5 pb-5">
          <Button
            variant="primary"
            onPress={() => handleAction("approve")}
            isDisabled={verifyMutation.isPending}
          >
            Approve
          </Button>
          <Button
            variant="secondary"
            onPress={() => handleAction("reject")}
            isDisabled={verifyMutation.isPending}
          >
            Reject
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
