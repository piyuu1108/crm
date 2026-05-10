"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Chip,
  Button,
  Spinner,
} from "@heroui/react";
import { LayoutCells, ArrowRight } from "@gravity-ui/icons";
import { useCounselorDivisionsQuery } from "@/app/lib/queries/counselor";
import { sortDivisions } from "@/app/lib/utils/sort-utils";

const SPEC_COLOR: Record<string, "accent" | "success" | "warning"> = {
  AI: "accent",
  DS: "success",
  REGULAR: "warning",
};

export default function CounselorDivisionsPage() {
  const router = useRouter();
  const { data: divisions, isLoading, isError, error } = useCounselorDivisionsQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Spinner size="lg" color="accent" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading assigned divisions...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold mb-2">Failed to load divisions</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "Internal Server Error"}
        </p>
        <Button variant="secondary" onPress={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!divisions || divisions.length === 0) {
    return (
      <Card className="border border-divider p-12 text-center bg-default/5">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-full bg-default/10 flex items-center justify-center">
            <LayoutCells className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">No assigned divisions</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
              You haven't been assigned as a counselor to any division for the active semester.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Divisions</h1>
          <p className="text-sm text-muted-foreground">
            Manage students and uploads for your assigned classes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortDivisions(divisions, (d) => d.displayName).map((div) => (
          <Card
            key={div.id}
            className="group border border-divider hover:border-accent/40 transition-all duration-300"
          >
            <Card.Content className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="size-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <LayoutCells className="size-6" />
                </div>
                <Chip
                  color={SPEC_COLOR[div.specialization] || "accent"}
                  variant="soft"
                  size="sm"
                  className="font-medium"
                >
                  {div.specialization}
                </Chip>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-bold font-mono group-hover:text-accent transition-colors">
                  {div.displayName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Batch {div.batchYear} · Semester {div.semesterNo}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-divider/50">
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-foreground">
                    {div.studentCount}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Students
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => router.push(`/app/counselor/divisions/${div.id}`)}
                  className="rounded-lg shadow-lg shadow-accent/20"
                >
                  Manage
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
