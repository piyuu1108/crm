"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Spinner,
  Button,
  Card,
  Chip,
  Select,
  ListBox,
} from "@heroui/react";
import { Plus, Clock, Check, Xmark } from "@gravity-ui/icons";

// ─── Status chip styling ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  pending: { label: "Pending", variant: "secondary", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { label: "Approved", variant: "secondary", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", variant: "secondary", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function StatusChip({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Chip variant="secondary" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Chip>
  );
}

// ─── Request Card ───────────────────────────────────────────────────────────
function RequestCard({
  request,
  viewerRole,
}: {
  request: any;
  viewerRole: "student" | "faculty";
}) {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(request.createdAt));

  return (
    <Link
      href={`/app/workflows/requests/${request.id}`}
      className="block w-full"
    >
      <Card className="w-full transition-all hover:shadow-md hover:border-accent/40">
        <Card.Content className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {request.subject}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted">
              {viewerRole === "student" ? (
                <span>To: {request.targetFacultyName}</span>
              ) : (
                <span>From: {request.studentName}</span>
              )}
              <span>•</span>
              <span>{dateStr}</span>
              {request.divisionName && request.divisionName !== "N/A" && (
                <>
                  <span>•</span>
                  <span>{request.divisionName}</span>
                </>
              )}
            </div>
            {request.description && (
              <p className="text-xs text-muted mt-1 line-clamp-1">
                {request.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {request.attachmentUrl && (
              <Chip variant="secondary" className="text-[10px]">
                📎 File
              </Chip>
            )}
            <StatusChip status={request.status} />
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function RequestsPage() {
  const { activeRole } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const limit = 15;

  const isStudent = activeRole === "student";
  const isFaculty = activeRole === "faculty" || activeRole === "hod" || activeRole === "counselor";

  const apiUrl = isStudent ? "/api/requests" : "/api/requests/faculty";

  const { data, isLoading, error } = useQuery({
    queryKey: ["requests", activeRole, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String((page - 1) * limit));
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`${apiUrl}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    enabled: !!activeRole,
  });

  const requests = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isStudent ? "My Requests" : "Incoming Requests"}
          </h1>
          <p className="text-sm text-muted">
            {isStudent
              ? "Track your applications and requests to faculty"
              : "Review and respond to student requests"}
          </p>
        </div>
        {isStudent && (
          <Button
            variant="primary"
            onPress={() => router.push("/app/workflows/requests/create")}
          >
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        )}
      </div>

      {/* Status Filter Dropdown */}
      <div className="flex items-center gap-3">
        <Select
          className="w-[180px]"
          selectedKey={statusFilter}
          onSelectionChange={(key) => {
            setStatusFilter(key as string);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <Select.Trigger>
            <Select.Value>
              {({ isPlaceholder, state }) => {
                if (isPlaceholder || state.selectedItems.length === 0) {
                  return "All Status";
                }
                const item = state.selectedItems[0];
                return (
                  <div className="flex items-center gap-2">
                    {item.key === "pending" && <Clock className="h-3.5 w-3.5" />}
                    {item.key === "approved" && <Check className="h-3.5 w-3.5" />}
                    {item.key === "rejected" && <Xmark className="h-3.5 w-3.5" />}
                    <span>{item.textValue}</span>
                  </div>
                );
              }}
            </Select.Value>
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue="All Status">
                All Status
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="pending" textValue="Pending">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  <span>Pending</span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="approved" textValue="Approved">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span>Approved</span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="rejected" textValue="Rejected">
                <div className="flex items-center gap-2">
                  <Xmark className="h-3.5 w-3.5 text-red-500" />
                  <span>Rejected</span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" color="accent" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <Card.Content>
            <p className="text-danger">Failed to load requests. Please try again.</p>
          </Card.Content>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-4xl">📋</div>
            <p className="text-muted">
              {statusFilter === "all"
                ? isStudent
                  ? "You haven't submitted any requests yet."
                  : "No requests assigned to you."
                : `No ${statusFilter} requests found.`}
            </p>
            {isStudent && statusFilter === "all" && (
              <Button
                variant="secondary"
                onPress={() => router.push("/app/workflows/requests/create")}
              >
                <Plus className="h-4 w-4" />
                Create your first request
              </Button>
            )}
          </Card.Content>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((req: any) => (
            <RequestCard
              key={req.id}
              request={req}
              viewerRole={isStudent ? "student" : "faculty"}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            size="sm"
            variant="tertiary"
            isDisabled={page === 1}
            onPress={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="tertiary"
            isDisabled={page === totalPages}
            onPress={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
