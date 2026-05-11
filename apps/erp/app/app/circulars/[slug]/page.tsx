"use client";

import React, { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Spinner,
  Card,
  Button,
  Chip,
  Alert,
  Skeleton,
} from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  ArrowLeft,
  ArrowDownToLine,
  FileText,
  TrashBin,
  Calendar,
  Person,
} from "@gravity-ui/icons";

// ─── Audience badge ───────────────────────────────────────────────────────────

function AudienceBadge({ circular }: { circular: any }) {
  const map: Record<string, { label: string; color: "accent" | "success" | "warning" | "danger" | "default" }> = {
    ALL: { label: "Global", color: "success" },
    FACULTY: { label: "Faculty Only", color: "accent" },
    YEAR: { label: `Year ${circular.targetYear}`, color: "warning" },
    DIVISION: {
      label: circular.targetDivisionIds?.length
        ? `${circular.targetDivisionIds.length} Division${circular.targetDivisionIds.length > 1 ? "s" : ""}`
        : "Division",
      color: "danger",
    },
  };
  const cfg = map[circular.targetType] ?? { label: circular.targetType, color: "default" };
  return (
    <Chip color={cfg.color} variant="soft" size="sm">
      {cfg.label}
    </Chip>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex justify-between">
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Card className="p-6 lg:p-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CircularDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { activeRole, user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["circular", slug],
    queryFn: async () => {
      const res = await fetch(`/api/circulars/${slug}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch circular");
      return json.data;
    },
    staleTime: 60_000,
    retry: false, // Don't retry 403s
  });

  const isHod = activeRole === "hod";
  const canDelete =
    isHod || (data?.facultyId && data.facultyId === user?.id);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this circular?")) return;
    try {
      const res = await fetch(`/api/faculty/circulars/${slug}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to delete");
      }
      await queryClient.invalidateQueries({ queryKey: ["circulars"] });
      router.push("/app/circulars");
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Delete failed"}`);
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (error || !data) {
    const is403 = error?.message?.toLowerCase().includes("access denied") ||
      error?.message?.toLowerCase().includes("denied");
    return (
      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-4">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{is403 ? "Access Denied" : "Not Found"}</Alert.Title>
            <Alert.Description>
              {is403
                ? "You do not have permission to view this circular."
                : error instanceof Error
                ? error.message
                : "This circular could not be found."}
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <Button variant="secondary" onPress={() => router.push("/app/circulars")}>
          Back to Circulars
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {canDelete && (
          <Button variant="danger" onPress={handleDelete}>
            <TrashBin className="w-4 h-4" />
            Delete
          </Button>
        )}
      </div>

      {/* ── Content card ────────────────────────────────────────────── */}
      <Card className="p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          {/* Title + meta */}
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              {data.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-divider pb-5">
              <div className="flex items-center gap-1.5">
                <Person className="w-4 h-4" />
                <span>{data.facultyName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Intl.DateTimeFormat("en-IN", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(data.createdAt))}
                </span>
              </div>
              <div className="ml-auto">
                <AudienceBadge circular={data} />
              </div>
            </div>
          </div>

          {/* Body */}
          {data.description && (
            <div
              className="prose prose-sm sm:prose max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: data.description }}
            />
          )}

          {/* Attachment */}
          {data.attachmentUrl && (
            <div className="pt-5 border-t border-divider">
              <h3 className="text-base font-semibold mb-3">Attachment</h3>
              <Card className="bg-default-50 border border-divider shadow-none">
                <Card.Content className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent/10 text-accent rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Document
                      </p>
                      {data.attachmentType && data.attachmentSize && (
                        <p className="text-xs text-muted-foreground">
                          {data.attachmentType} ·{" "}
                          {Math.round(data.attachmentSize / 1024)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => {
                      const url = data.attachmentUrl.startsWith("http")
                        ? data.attachmentUrl
                        : `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.amazonaws.com/${data.attachmentUrl}`;
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
        </div>
      </Card>
    </div>
  );
}
