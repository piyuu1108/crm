"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { usePermission } from "@/app/lib/hooks/use-permission";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Chip, Pagination, Skeleton } from "@heroui/react";
import { Plus, Bell } from "@gravity-ui/icons";

// ─── Audience badge config ────────────────────────────────────────────────────

type AudienceVariant = "accent" | "success" | "warning" | "danger" | "default";

const AUDIENCE_CONFIG: Record<
  string,
  { label: (c: any) => string; color: AudienceVariant }
> = {
  ALL: { label: () => "Global", color: "success" },
  FACULTY: { label: () => "Faculty", color: "accent" },
  YEAR: { label: (c) => `Year ${c.targetYear}`, color: "warning" },
  DIVISION: {
    label: (c) =>
      c.targetDivisionIds?.length
        ? `${c.targetDivisionIds.length} Division${c.targetDivisionIds.length > 1 ? "s" : ""}`
        : "Division",
    color: "danger",
  },
};

function AudienceBadge({ circular }: { circular: any }) {
  const cfg = AUDIENCE_CONFIG[circular.targetType] ?? {
    label: () => circular.targetType,
    color: "default" as AudienceVariant,
  };
  return (
    <Chip color={cfg.color} variant="soft" size="sm">
      {cfg.label(circular)}
    </Chip>
  );
}

// ─── Skeleton cards ───────────────────────────────────────────────────────────

function CircularSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="w-full border border-divider">
          <Card.Content className="flex justify-between items-center gap-4 p-4">
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-5 w-2/3 rounded" />
              <Skeleton className="h-3.5 w-1/3 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ canCreate, onCreateClick }: { canCreate: boolean; onCreateClick: () => void }) {
  return (
    <Card className="w-full border border-divider p-12 text-center">
      <Card.Content className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-default/20 p-4">
          <Bell className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">No circulars yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canCreate
              ? "Publish the first circular to notify your students."
              : "No notices have been published for you yet."}
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onPress={onCreateClick}>
            <Plus className="w-4 h-4" />
            Create Circular
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CircularsPage() {
  const { activeRole } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;

  const canCreate = usePermission("circulars.create");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["circulars", page, limit],
    queryFn: async () => {
      const res = await fetch(
        `/api/circulars?limit=${limit}&offset=${(page - 1) * limit}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to fetch circulars");
      }
      return res.json();
    },
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const circularsData: any[] = data?.data ?? [];
  const total: number = data?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Circulars &amp; Notices
          </h1>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} notice${total !== 1 ? "s" : ""} visible to you`
              : "Stay updated with the latest announcements"}
          </p>
        </div>
        {canCreate && (
          <Button onPress={() => router.push("/app/circulars/create")}>
            <Plus className="h-4 w-4" />
            Create Circular
          </Button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <CircularSkeleton />
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <p className="text-sm text-danger font-medium">
              {error instanceof Error ? error.message : "Failed to load circulars"}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onPress={() =>
                queryClient.invalidateQueries({ queryKey: ["circulars"] })
              }
            >
              Try Again
            </Button>
          </Card.Content>
        </Card>
      ) : circularsData.length === 0 ? (
        <EmptyState
          canCreate={canCreate}
          onCreateClick={() => router.push("/app/circulars/create")}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {circularsData.map((circular: any) => (
            <Link
              key={circular.id}
              href={`/app/circulars/${circular.slug}`}
              className="block w-full"
            >
              <Card className="w-full border border-divider hover:border-accent/50 hover:shadow-sm transition-all duration-150">
                <Card.Content className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {circular.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>By {circular.facultyName}</span>
                      <span>•</span>
                      <span>
                        {new Intl.DateTimeFormat("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(circular.createdAt))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {circular.attachmentUrl && (
                      <Chip variant="soft" size="sm" color="default">
                        Attachment
                      </Chip>
                    )}
                    <AudienceBadge circular={circular} />
                  </div>
                </Card.Content>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-2">
          <Pagination>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={page === 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Pagination.PreviousIcon />
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={page === totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}
    </div>
  );
}
