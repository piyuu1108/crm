"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, Button, Spinner, Dropdown, ComboBox, Input, Label, ListBox } from "@heroui/react";
import { Funnel, Flask } from "@gravity-ui/icons";
import { useReadonlyTimetableQuery, TimetableSlot } from "@/app/lib/queries/timetable";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { usePermission } from "@/app/lib/hooks/use-permission";
import { useQuery } from "@tanstack/react-query";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FIXED_TIME_SLOTS = [
  { start: "07:50", end: "08:40" },
  { start: "08:40", end: "09:30" },
  { start: "09:40", end: "10:30" },
  { start: "10:30", end: "11:20" },
  { start: "11:20", end: "12:30" },
];

import { useTimetableColors, type Palette } from "@/app/lib/hooks/use-timetable-colors";

function normalizeTime(t: string) {
  return t ? t.slice(0, 5) : t;
}

function formatTimeRange(start: string, end: string) {
  return `${normalizeTime(start)} - ${normalizeTime(end)}`;
}

// ─── Readonly Slot Card ─────────────────────────────────────────────────────

function ReadonlySlotCard({
  slot,
  palette,
  showDivision,
}: {
  slot: TimetableSlot;
  palette: Palette;
  showDivision: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg p-3 min-h-[76px] transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: palette.bg,
        border: `1.5px solid ${palette.border}`,
      }}
    >
      {/* Subject name — truncated, full on hover via title */}
      <div
        className="text-[13px] font-semibold leading-snug flex items-start gap-1 overflow-hidden"
        style={{ color: palette.text }}
      >
        {slot.isLab && <Flask className="size-3.5 mt-0.5 shrink-0" style={{ color: palette.text }} />}
        <span
          className="flex-1 min-w-0 truncate"
          title={slot.subjectName}
        >
          {slot.subjectName}
          {slot.isLab && slot.labId && (
            <span
              className="ml-1 inline-block text-[9px] uppercase px-1 py-0.5 rounded font-medium"
              style={{
                backgroundColor: `${palette.border}40`,
                color: palette.text,
              }}
            >
              {slot.labId}
            </span>
          )}
        </span>
      </div>

      {/* Secondary info: faculty or division — always truncated */}
      <span
        className="text-[11px] leading-tight mt-auto truncate block"
        style={{ color: `${palette.text}99` }}
        title={showDivision ? slot.divisionName : slot.facultyName}
      >
        {showDivision ? slot.divisionName : slot.facultyName}
      </span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AcademicsTimetablePage() {
  const { activeRole } = useAuthStore();
  const isAdmin = usePermission("timetable.view_any");

  const [forWhom, setForWhom] = useState<"class" | "faculty">("class");
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);

  // Fetch list of divisions
  const { data: divisionsData, isLoading: isDivisionsLoading } = useQuery({
    queryKey: ["admin-divisions-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/divisions?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch divisions");
      return res.json();
    },
    enabled: isAdmin,
  });

  const divisions = divisionsData?.data?.divisions ?? [];

  // Fetch list of faculty
  const { data: facultyData, isLoading: isFacultyLoading } = useQuery({
    queryKey: ["admin-faculty-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/faculty?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch faculty");
      return res.json();
    },
    enabled: isAdmin,
  });

  const facultyList = facultyData?.data?.faculty ?? [];

  // Fetch dynamic admin timetable
  const { data: adminTimetableData, isLoading: isAdminTimetableLoading, isError: isAdminTimetableError, error: adminTimetableError, refetch: refetchAdminTimetable } = useQuery({
    queryKey: ["admin-timetable", forWhom, selectedTargetId],
    queryFn: async () => {
      if (!selectedTargetId) return { entries: [] };
      const res = await fetch(`/api/academics/timetable?type=${forWhom}&id=${selectedTargetId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch timetable");
      const json = await res.json();
      return json.data;
    },
    enabled: isAdmin && !!selectedTargetId,
  });

  // Non-admin query
  const { data: nonAdminData, isLoading: isNonAdminLoading, isError: isNonAdminError, error: nonAdminError, refetch: refetchNonAdmin } = useReadonlyTimetableQuery(
    isAdmin ? undefined : (activeRole ?? undefined)
  );

  const data = isAdmin ? adminTimetableData : nonAdminData;
  const isLoading = isAdmin ? (isDivisionsLoading || isFacultyLoading || (!!selectedTargetId && isAdminTimetableLoading)) : isNonAdminLoading;
  const isError = isAdmin ? isAdminTimetableError : isNonAdminError;
  const error = isAdmin ? adminTimetableError : nonAdminError;
  const refetch = isAdmin ? refetchAdminTimetable : refetchNonAdmin;

  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const counselorDivisions = useMemo(() => {
    if (isAdmin) return [];
    if (data?.role !== "counselor") return [];
    if (data?.divisionName) {
      return data.divisionName.split(",").map((d: string) => d.trim()).filter(Boolean);
    }
    return [];
  }, [data, isAdmin]);

  useEffect(() => {
    if (!isAdmin && data?.role === "counselor" && counselorDivisions.length > 0 && !selectedDivision) {
      setSelectedDivision(counselorDivisions[0]);
    }
  }, [data, counselorDivisions, selectedDivision, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      if (forWhom === "class" && divisions.length > 0) {
        setSelectedTargetId((prev) => (prev && divisions.some((d: any) => d.id === prev) ? prev : divisions[0].id));
      } else if (forWhom === "faculty" && facultyList.length > 0) {
        setSelectedTargetId((prev) => (prev && facultyList.some((f: any) => f.id === prev) ? prev : facultyList[0].id));
      }
    }
  }, [isAdmin, forWhom, divisions, facultyList]);

  const slots = useMemo(() => {
    const allSlots = data?.entries ?? [];
    if (!isAdmin && data?.role === "counselor" && selectedDivision) {
      return allSlots.filter((s: any) => s.divisionName === selectedDivision);
    }
    return allSlots;
  }, [data, selectedDivision, isAdmin]);

  const selectedTargetLabel = useMemo(() => {
    if (!selectedTargetId) return "";
    if (forWhom === "class") {
      const found = divisions.find((d: any) => d.id === selectedTargetId);
      return found ? found.displayName : "";
    } else {
      const found = facultyList.find((f: any) => f.id === selectedTargetId);
      return found ? (found.facultyCode ? `${found.facultyCode} - ${found.name}` : found.name) : "";
    }
  }, [selectedTargetId, forWhom, divisions, facultyList]);

  const showDivision = isAdmin ? (forWhom === "faculty") : (data?.role === "faculty");
  const { getColorForSlot } = useTimetableColors(slots, showDivision ? "division" : "subject");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-64 bg-default-200 rounded-md"></div>
        <Card className="border border-divider p-8">
          <div className="flex justify-center">
            <Spinner size="lg" color="accent" />
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">My Timetable</h1>
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load timetable
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
            </div>
            <Button variant="secondary" onPress={() => refetch()}>
              Try Again
            </Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (data?.role === "student" && data.isPublished === false) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">My Timetable</h1>
          <p className="text-sm text-muted-foreground">
            {data.divisionName ? `Class: ${data.divisionName}` : "Class Schedule"}
          </p>
        </div>
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <div className="text-5xl">🔒</div>
            <h2 className="text-lg font-semibold text-foreground">
              Timetable not published yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Your class timetable is currently in draft or has not been published by the administration.
            </p>
          </Card.Content>
        </Card>
      </div>
    );
  }



  const roleTitle =
    isAdmin ? (selectedTargetLabel ? `Timetable for ${forWhom === "class" ? "Class" : "Faculty"} ${selectedTargetLabel}` : "Select a target to view timetable") :
    data?.role === "faculty" ? "Teaching Schedule" :
    data?.role === "counselor" ? `Timetable for ${selectedDivision || data.divisionName || "Assigned Division"}` :
    data?.role === "student" ? `Timetable for ${data.divisionName}` :
    "Timetable";

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? "Timetable Viewer" : (data?.role === "faculty" ? "My Timetable" : "Timetable")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roleTitle}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* For Whom? Dropdown */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">For Whom?</span>
              <Dropdown>
                <Button variant="secondary" className="min-w-[130px] justify-between">
                  <div className="flex items-center gap-2">
                    <Funnel className="size-4" />
                    {forWhom === "class" ? "Class" : "Faculty"}
                  </div>
                </Button>
                <Dropdown.Popover className="min-w-[130px]">
                  <Dropdown.Menu
                    selectionMode="single"
                    selectedKeys={new Set([forWhom])}
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0] as "class" | "faculty";
                      if (key) {
                        setForWhom(key);
                        setSelectedTargetId(null);
                      }
                    }}
                  >
                    <Dropdown.Item key="class" id="class" textValue="Class">Class</Dropdown.Item>
                    <Dropdown.Item key="faculty" id="faculty" textValue="Faculty">Faculty</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>

            {/* Selection Dropdown */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                Select {forWhom === "class" ? "Class" : "Faculty"}
              </span>
              <ComboBox
                className="min-w-[220px]"
                isDisabled={forWhom === "class" ? divisions.length === 0 : facultyList.length === 0}
                selectedKey={selectedTargetId ? selectedTargetId.toString() : null}
                onSelectionChange={(key) => {
                  if (key) {
                    setSelectedTargetId(parseInt(String(key), 10));
                  } else {
                    setSelectedTargetId(null);
                  }
                }}
              >
                <ComboBox.InputGroup>
                  <Input placeholder={`Search ${forWhom === "class" ? "class" : "faculty"}...`} />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover className="min-w-[220px] max-h-[300px] overflow-auto">
                  <ListBox>
                    {forWhom === "class"
                      ? divisions.map((div: any) => (
                          <ListBox.Item key={div.id.toString()} id={div.id.toString()} textValue={div.displayName}>
                            {div.displayName}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))
                      : facultyList.map((fac: any) => {
                          const displayLabel = fac.facultyCode ? `${fac.facultyCode} - ${fac.name}` : fac.name;
                          return (
                            <ListBox.Item key={fac.id.toString()} id={fac.id.toString()} textValue={displayLabel}>
                              {displayLabel}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          );
                        })}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            </div>
          </div>
        )}

        {!isAdmin && data?.role === "counselor" && counselorDivisions.length > 1 && (
          <Dropdown>
            <Button variant="secondary" className="min-w-[200px] justify-between">
              <div className="flex items-center gap-2">
                <Funnel className="size-4" />
                {selectedDivision || "Select Division"}
              </div>
            </Button>
            <Dropdown.Popover className="min-w-[200px]">
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={selectedDivision ? new Set([selectedDivision]) : new Set()}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as string;
                  if (key) setSelectedDivision(key);
                }}
              >
                {counselorDivisions.map((div: string) => (
                  <Dropdown.Item key={div} id={div} textValue={div}>
                    {div}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>

      {/* ── Timetable Grid ─── */}
      <div className="overflow-auto rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <table
          className="w-full border-collapse"
          style={{ minWidth: 900, tableLayout: "fixed" }}
        >
          {/* Column widths */}
          <colgroup>
            <col style={{ width: 110 }} />
            {DAYS.map((day) => (
              <col key={day} />
            ))}
          </colgroup>
          {/* Header */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[110px] bg-gray-50/80 backdrop-blur-sm px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 border-b border-r border-gray-200/60">
                Time
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="bg-gray-50/80 backdrop-blur-sm px-2 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200/60"
                  style={{ minWidth: 140 }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {FIXED_TIME_SLOTS.map((time, rowIdx) => (
              <tr
                key={`${time.start}-${time.end}`}
                className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
              >
                {/* Time label */}
                <td
                  className="sticky left-0 z-10 border-r border-gray-200/60 px-4 py-2"
                  style={{
                    backgroundColor: rowIdx % 2 === 0 ? "#ffffff" : "#fafafa",
                  }}
                >
                  <span className="text-[12px] font-medium text-gray-600 whitespace-nowrap">
                    {formatTimeRange(time.start, time.end)}
                  </span>
                </td>

                {/* Day cells */}
                {DAYS.map((day) => {
                  const cellSlots = slots.filter(
                    (s: any) =>
                      s.dayOfWeek === day &&
                      normalizeTime(s.startTime) === time.start &&
                      normalizeTime(s.endTime) === time.end
                  );
                  return (
                    <td
                      key={`${day}-${time.start}`}
                      className="p-1.5 align-top"
                      style={{ minWidth: 140 }}
                    >
                      <div className="h-full min-h-[80px] overflow-hidden">
                        {cellSlots.length > 0 ? (
                          <div className="flex flex-col gap-1.5 h-full">
                            {cellSlots.map((slot: any, idx: number) => (
                              <ReadonlySlotCard
                                key={slot.id || idx}
                                slot={slot}
                                palette={getColorForSlot(slot)}
                                showDivision={showDivision}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[80px] rounded-lg border-2 border-dashed border-gray-200/60" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
