"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { usePermission } from "@/app/lib/hooks/use-permission";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Pagination,
  Skeleton,
  ScrollShadow,
  Avatar,
  TextField,
  InputGroup,
} from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Envelope,
  TrashBin,
  TriangleExclamation,
  Xmark,
} from "@gravity-ui/icons";
import { cn } from "@/lib/utils";

// ─── Custom SVG Icons for Precise Replication ───────────────────────────────

function DotsVerticalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} width="16" height="16">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      className={className}
    >
      <path
        d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M22 22L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  if (diffDays < 2 && d.getDate() === now.getDate() - 1) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateText = d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  return `${dateText} ${timeStr}`;
}

function getAudienceLabel(circular: any): string {
  if (circular.targetType === "ALL") return "All Students & Staff";
  if (circular.targetType === "FACULTY") return "Faculty & Staff";
  if (circular.targetType === "YEAR") return `Year ${circular.targetYear}`;
  if (circular.targetType === "DIVISION") return "Specific Divisions";
  return circular.targetType || "Everyone";
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CircularSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="w-full border border-divider/25 p-4 flex flex-col gap-3 bg-transparent shadow-none">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
          <Skeleton className="h-4.5 w-3/4 rounded" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-full rounded" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function DetailEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-default-50/40 rounded-2xl h-full border border-divider/30 shadow-inner select-none">
      <div className="flex flex-col items-center text-center max-w-sm gap-2">
        <div className="rounded-full bg-default-100 p-4 border border-divider/25 shadow-sm">
          <Envelope className="w-8 h-8 text-default-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mt-2">Select a circular</h3>
        <p className="text-xs text-default-400">
          Choose any notice from the sidebar to read its details.
        </p>
      </div>
    </div>
  );
}

// ─── Circular Detail Reader Pane ──────────────────────────────────────────────

interface CircularDetailReaderProps {
  slug: string;
  onBack: () => void;
}

function CircularDetailReader({ slug, onBack }: CircularDetailReaderProps) {
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
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="flex-1 p-8 h-full bg-white rounded-2xl shadow-sm border border-divider/30 flex flex-col gap-6">
        <Skeleton className="h-10 w-3/4 rounded-xl" />
        <div className="flex items-center gap-4 bg-default-50 border border-divider/25 rounded-2xl p-4 sm:p-5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
        </div>
        <div className="flex flex-col gap-3 p-6 border border-divider/25 rounded-2xl flex-1">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-11/12 rounded" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col gap-4 p-8 bg-white rounded-2xl shadow-sm border border-divider/30 items-center justify-center">
        <p className="text-sm font-semibold text-danger">Notice could not be loaded.</p>
        <Button variant="secondary" size="sm" onPress={onBack}>
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <Card className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-divider/30 overflow-hidden h-full">
      {/* Top Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between px-5 border-b border-divider/25 select-none">
        {/* Left Side Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={onBack}
            className="rounded-full bg-default-100 hover:bg-default-200 text-default-600 w-8 h-8 flex items-center justify-center shrink-0 mr-1 border-none shadow-none"
          >
            <Xmark className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
            <TrashBin className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
            <TriangleExclamation className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
            <Envelope className="w-4 h-4" />
          </Button>
          <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
            <DotsVerticalIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Right Side Pagination */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-default-400 font-medium select-none">1 of 1</span>
          <div className="flex items-center gap-0.5">
            <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Detail Canvas Content */}
      <ScrollShadow className="flex-1 overflow-y-auto px-6 py-4" hideScrollBar>
        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground leading-tight mb-4">
          {data.title}
        </h1>

        {/* Sender details row */}
        <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar circle matching template styling */}
            <Avatar className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-teal-400 to-emerald-500 text-white font-semibold text-sm">
                {getInitials(data.facultyName)}
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate leading-none">
                {data.facultyName}
              </span>
              <span className="text-xs text-default-400 flex items-center gap-1.5 mt-0.5 select-none">
                <span>{data.facultyName.toLowerCase().replace(/\s+/g, "")}@heroui.dev</span>
                <span className="text-default-300">to me</span>
                <ChevronDownIcon className="w-3 h-3 text-default-400 -ml-0.5" />
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-default-400 select-none mr-1">
              {formatFullDate(data.createdAt)}
            </span>
            <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
              <ReplyIcon className="w-4 h-4" />
            </Button>
            <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
              <StarIcon className="w-4 h-4" />
            </Button>
            <Button isIconOnly variant="ghost" className="text-default-400 hover:text-foreground w-8 h-8 border-none shadow-none">
              <DotsVerticalIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Pure description canvas */}
        {data.description && (
          <div className="text-default-700 leading-relaxed text-base whitespace-pre-line">
            <div dangerouslySetInnerHTML={{ __html: data.description }} />
          </div>
        )}
      </ScrollShadow>
    </Card>
  );
}

// ─── Main Unified Circulars Page ──────────────────────────────────────────────

export default function CircularsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 10;

  // Read selected slug from URL parameters (?select=slug)
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("select") || undefined;

  const { data, isLoading, isError } = useQuery({
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

  // Client-side dynamic matching
  const filteredCirculars = circularsData.filter((c: any) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.facultyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCircular = (slug: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("select", slug);
    router.push(`/app/circulars?${params.toString()}`);
  };

  const handleClearSelection = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("select");
    router.push(`/app/circulars?${params.toString()}`);
  };

  return (
    <div className="w-full h-[calc(100vh-6.5rem)] flex bg-transparent overflow-hidden -mt-3">
      {/* ── Left Sidebar Master List Pane ── */}
      <div
        className={cn(
          "w-full lg:w-[320px] shrink-0 flex flex-col h-full bg-transparent pr-2 pt-0.5 pb-1",
          selectedSlug ? "hidden lg:flex" : "flex"
        )}
      >
        {/* Dynamic Search Box matching inspiration */}
        <div className="w-full mb-3 shrink-0 px-1">
          <TextField
            aria-label="Search"
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full"
          >
            <InputGroup className="rounded-lg bg-white border border-divider/30 shadow-sm">
              <InputGroup.Prefix>
                <SearchIcon className="text-default-400 w-4 h-4 ml-2" />
              </InputGroup.Prefix>
              <InputGroup.Input placeholder="Search..." className="bg-transparent text-sm h-9 pl-1" />
            </InputGroup>
          </TextField>
        </div>

        {/* Scrollable Notices List */}
        <ScrollShadow className="flex-1 overflow-y-auto px-1 pb-4" hideScrollBar>
          {isLoading ? (
            <CircularSkeleton />
          ) : isError ? (
            <div className="text-center p-8 border border-divider/25 rounded-2xl bg-default-50/20">
              <p className="text-xs text-danger font-medium">Failed to load announcements.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onPress={() => queryClient.invalidateQueries({ queryKey: ["circulars"] })}
              >
                Retry
              </Button>
            </div>
          ) : filteredCirculars.length === 0 ? (
            <div className="text-center p-8 border border-divider/25 rounded-2xl bg-default-50/20">
              <p className="text-xs text-default-400 font-medium">No circulars match your search.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 flex-1">
              {filteredCirculars.map((circular: any) => {
                const isActive = circular.slug === selectedSlug;
                return (
                  <div
                    key={circular.id}
                    onClick={() => handleSelectCircular(circular.slug)}
                    className={cn(
                      "relative flex items-start gap-3 rounded-lg p-3 transition-all duration-200 cursor-pointer select-none border border-transparent",
                      isActive
                        ? "bg-white shadow-sm text-foreground border-divider/10"
                        : "bg-transparent hover:bg-default-100/60 text-default-600"
                    )}
                  >
                    {/* Circle Avatar on Left */}
                    <Avatar className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      <Avatar.Fallback className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-cyan-400 to-blue-500 text-white font-semibold text-xs">
                        {getInitials(circular.facultyName)}
                      </Avatar.Fallback>
                    </Avatar>

                    {/* Three-Line Clean Metadata Content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[13px] text-foreground truncate leading-none">
                          {circular.facultyName}
                        </span>
                        <span className="text-[10px] text-default-400 shrink-0 select-none">
                          {formatShortDate(circular.createdAt)}
                        </span>
                      </div>
                      <span className="font-medium text-xs text-default-800 truncate mt-0.5 leading-tight">
                        {circular.title}
                      </span>
                      <span className="text-[11px] text-default-400 font-normal mt-0.5 line-clamp-1">
                        For: {getAudienceLabel(circular)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollShadow>

        {/* Simple Pagination bar */}
        {totalPages > 1 && (
          <div className="flex justify-center pt-3 border-t border-divider/30 shrink-0">
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

      {/* ── Right Canvas Detail Reader Pane ── */}
      <div
        className={cn(
          "flex-1 min-w-0 h-full flex flex-col pl-2 bg-transparent",
          selectedSlug ? "flex animate-fade-in" : "hidden lg:flex"
        )}
      >
        {selectedSlug ? (
          <CircularDetailReader
            slug={selectedSlug}
            onBack={handleClearSelection}
          />
        ) : (
          <DetailEmptyState />
        )}
      </div>
    </div>
  );
}
