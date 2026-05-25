"use client";

import React, { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { usePermission } from "@/app/lib/hooks/use-permission";
import {
  Spinner,
  Card,
  Button,
  Chip,
  Alert,
  Switch,
  Label,
  toast,
} from "@heroui/react";
import {
  ArrowLeft,
  ArrowDownToLine,
  FileText,
  Person,
  Calendar,
  Check,
  Xmark,
} from "@gravity-ui/icons";

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.FC<any> }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: () => (
      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
    ),
  },
  approved: {
    label: "Approved",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: Check,
  },
  rejected: {
    label: "Rejected",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: Xmark,
  },
};

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = parseInt(rawId, 10);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeRole, user } = useAuthStore();

  const isStudent = activeRole === "student";
  const isFaculty = usePermission("requests.review");

  // ── Fetch request detail ──────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ["request-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/requests/${id}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch request");
      }
      return res.json();
    },
    enabled: !isNaN(id),
  });

  const request = data?.data;

  // ── Status update mutation ────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async (newStatus: "approved" | "rejected") => {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const newStatus = data.data.status;
      toast.success(`Request ${newStatus}`, {
        description: `The request has been ${newStatus}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["request-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (err: Error) => {
      toast.danger("Update failed", {
        description: err.message,
      });
    },
  });

  // ── Determine approval state for toggle ───────────────────────────────
  const isApproved = request?.status === "approved";
  const isRejected = request?.status === "rejected";
  const isPending = request?.status === "pending";
  const isTargetFaculty = isFaculty && request?.targetFacultyId === user?.id;

  const handleToggleChange = (checked: boolean) => {
    statusMutation.mutate(checked ? "approved" : "rejected");
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error || !request) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>
              {(error as Error)?.message || "Request not found or access denied."}
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <Button variant="tertiary" onPress={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const createdDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(request.createdAt));

  const updatedDate =
    request.updatedAt && request.updatedAt !== request.createdAt
      ? new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(request.updatedAt))
      : null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Main card */}
      <Card className="p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          {/* Title + Status */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-foreground flex-1">
                {request.subject}
              </h1>
              <Chip
                variant="secondary"
                className={`shrink-0 text-xs font-semibold px-3 py-1 ${statusConfig.className}`}
              >
                {statusConfig.label}
              </Chip>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted border-b border-separator pb-6">
              <div className="flex items-center gap-1.5">
                <Person className="w-4 h-4" />
                <span>
                  {isStudent
                    ? `To: ${request.targetFacultyName}`
                    : `From: ${request.studentName}`}
                </span>
              </div>
              {!isStudent && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-default/50 px-2 py-0.5 rounded">
                    {request.divisionName}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{createdDate}</span>
              </div>
              {request.requestType && request.requestType !== "general" && (
                <Chip variant="secondary" className="text-xs">
                  {request.requestType}
                </Chip>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Description
            </h3>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {request.description}
            </p>
          </div>

          {/* Attachment */}
          {request.attachmentUrl && (
            <div className="pt-4 border-t border-separator">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Attachment
              </h3>
              <Card className="border border-separator shadow-none">
                <Card.Content className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent/10 text-accent rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        Document
                      </p>
                      <p className="text-xs text-muted">
                        {request.attachmentType}
                        {request.attachmentSize
                          ? ` • ${Math.round(request.attachmentSize / 1024)} KB`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      const url = request.attachmentUrl.startsWith("http")
                        ? request.attachmentUrl
                        : `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || ""}/${request.attachmentUrl}`;
                      window.open(url, "_blank");
                    }}
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Download
                  </Button>
                </Card.Content>
              </Card>
            </div>
          )}

          {/* Info cards (Student + Faculty) */}
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-separator">
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-default/30">
              <span className="text-xs text-muted font-medium">Student</span>
              <span className="text-sm font-semibold text-foreground">
                {request.studentName}
              </span>
              {request.divisionName && request.divisionName !== "N/A" && (
                <span className="text-xs text-muted">
                  {request.divisionName}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-default/30">
              <span className="text-xs text-muted font-medium">Faculty</span>
              <span className="text-sm font-semibold text-foreground">
                {request.targetFacultyName}
              </span>
            </div>
          </div> */}

          {/* Timestamps */}
          {updatedDate && (
            <div className="text-xs text-muted">
              Last updated: {updatedDate}
            </div>
          )}

          {/* Faculty approval toggle */}
          {isTargetFaculty && (
            <div className="pt-4 border-t border-separator">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Decision
              </h3>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-separator bg-default/20">
                <Switch
                  isSelected={isApproved}
                  onChange={handleToggleChange}
                  isDisabled={statusMutation.isPending}
                >
                  {({ isSelected }) => (
                    <>
                      <Switch.Control
                        className={
                          isSelected
                            ? "bg-green-500"
                            : "bg-red-400"
                        }
                      >
                        <Switch.Thumb>
                          <Switch.Icon>
                            {isSelected ? (
                              <Check className="size-3 text-inherit" />
                            ) : (
                              <Xmark className="size-3 text-inherit" />
                            )}
                          </Switch.Icon>
                        </Switch.Thumb>
                      </Switch.Control>
                      <Switch.Content>
                        <Label className="text-sm font-medium">
                          {isSelected ? "Approved" : "Rejected"}
                        </Label>
                      </Switch.Content>
                    </>
                  )}
                </Switch>
                {statusMutation.isPending && (
                  <Spinner size="sm" color="accent" />
                )}
              </div>
              {isPending && (
                <p className="text-xs text-muted mt-2">
                  Toggle the switch to approve or reject this request.
                </p>
              )}
            </div>
          )}

          {/* Remarks */}
          {request.remarks && (
            <div className="pt-4 border-t border-separator">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Faculty Remarks
              </h3>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {request.remarks}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
