"use client";

import React, { useMemo, useState } from "react";
import {
  Alert,
  Card,
  Chip,
  Input,
  Separator,
  Skeleton,
  TextField,
} from "@heroui/react";
import { BookOpen } from "@gravity-ui/icons";
import Link from "next/link";
import { useSubjectsListQuery, type SubjectListItem } from "@/app/lib/queries/subjects";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

const TYPE_COLORS: Record<string, "default" | "accent" | "success" | "warning" | "danger"> = {
  theory: "accent",
  practical: "success",
  both: "warning",
};

const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  practical: "Practical",
  both: "Theory + Practical",
};

export default function SubjectsListPage() {
  const { activeRole } = useAuthStore();
  const { data, isLoading, error } = useSubjectsListQuery(activeRole);
  const [search, setSearch] = useState("");

  const filteredSubjects = useMemo(() => {
    if (!data?.subjects) return [];
    if (!search.trim()) return data.subjects;
    const q = search.toLowerCase();
    return data.subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.subjectType.toLowerCase().includes(q) ||
        s.facultyName?.toLowerCase().includes(q) ||
        s.assignments?.some(
          (a) =>
            a.facultyName.toLowerCase().includes(q) ||
            a.divisionName.toLowerCase().includes(q)
        )
    );
  }, [data?.subjects, search]);

  const role = data?.role ?? "";
  const emptyMessage = data?.emptyMessage;

  // ─── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 py-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl py-4">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load subjects</Alert.Title>
            <Alert.Description>{error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Subjects
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === "student"
              ? "Subjects assigned to your division"
              : role === "faculty"
                ? "Subjects assigned to you"
                : role === "counselor"
                  ? "Subjects in your assigned divisions"
                  : "All subjects in the system"}
          </p>
        </div>
        <Chip variant="soft" size="sm" className="self-start capitalize">
          {role}
        </Chip>
      </div>

      {/* Search */}
      <TextField
        value={search}
        onChange={setSearch}
        aria-label="Search subjects"
      >
        <Input placeholder="Search by name, code, or faculty..." />
      </TextField>

      {/* Empty state */}
      {filteredSubjects.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          {emptyMessage ? (
            <Alert status="warning" className="max-w-md">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>No Subjects Available</Alert.Title>
                <Alert.Description>{emptyMessage}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-default/10">
                <BookOpen className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {search.trim()
                  ? "No subjects match your search."
                  : "No subjects found."}
              </p>
            </>
          )}
        </div>
      )}

      {/* Subject Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} role={role} />
        ))}
      </div>
    </div>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────

function SubjectCard({
  subject,
  role,
}: {
  subject: SubjectListItem;
  role: string;
}) {
  const totalMarks = useMemo(() => {
    let total = 0;
    if (subject.internalTheoryMax) total += subject.internalTheoryMax;
    if (subject.externalTheoryMax) total += subject.externalTheoryMax;
    if (subject.internalPracticalMax) total += subject.internalPracticalMax;
    if (subject.externalPracticalMax) total += subject.externalPracticalMax;
    return total;
  }, [subject]);

  // For student: single assignment, show faculty directly
  // For others: show assignment count
  const primaryFaculty =
    role === "student"
      ? subject.facultyName
      : subject.assignments?.[0]?.facultyName;

  const divisionCount = role === "student"
    ? undefined
    : new Set(subject.assignments?.map((a) => a.divisionName)).size;

  return (
    <Link href={`/app/subjects/${encodeURIComponent(subject.code)}`}>
  <Card className="relative overflow-hidden group h-full cursor-pointer border border-divider bg-background shadow-sm transition-all hover:border-accent/40 hover:shadow-md">
    
    {/* Top accent stripe */}
    <div className="absolute inset-x-0 top-0 h-1 bg-accent" />

    <Card.Content className="space-y-3 p-5 pt-6">
      {/* Code + Type badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="rounded bg-default/10 px-2 py-0.5 text-xs font-mono font-semibold text-foreground">
          {subject.code}
        </span>
        <Chip
          size="sm"
          color={TYPE_COLORS[subject.subjectType] ?? "default"}
        >
          {TYPE_LABELS[subject.subjectType] ?? subject.subjectType}
        </Chip>
      </div>

      {/* Subject name */}
      <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-accent transition-colors">
        {subject.name}
      </h3>

      <Separator />

      {/* Meta */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {primaryFaculty && (
          <p className="truncate">
            <span className="font-medium text-foreground/80">Faculty:</span>{" "}
            {primaryFaculty}
          </p>
        )}
        {role === "student" && subject.divisionName && (
          <p className="truncate">
            <span className="font-medium text-foreground/80">Division:</span>{" "}
            {subject.divisionName}
          </p>
        )}
        {divisionCount != null && divisionCount > 0 && (
          <p>
            <span className="font-medium text-foreground/80">Divisions:</span>{" "}
            {divisionCount}
          </p>
        )}
        {totalMarks > 0 && (
          <p>
            <span className="font-medium text-foreground/80">Total Marks:</span>{" "}
            {totalMarks}
          </p>
        )}
      </div>
    </Card.Content>
  </Card>
</Link>
  );
}
