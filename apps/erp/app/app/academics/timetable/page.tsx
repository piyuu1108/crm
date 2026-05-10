"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, Button, Spinner, Dropdown } from "@heroui/react";
import { Funnel, Flask } from "@gravity-ui/icons";
import { useReadonlyTimetableQuery, TimetableSlot } from "@/app/lib/queries/timetable";
import { useAuthStore } from "@/app/lib/store/use-auth-store";

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
  const { data, isLoading, isError, error, refetch } = useReadonlyTimetableQuery(activeRole ?? undefined);

  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const counselorDivisions = useMemo(() => {
    if (data?.role !== "counselor") return [];
    if (data?.divisionName) {
      return data.divisionName.split(",").map(d => d.trim()).filter(Boolean);
    }
    return [];
  }, [data]);

  useEffect(() => {
    if (data?.role === "counselor" && counselorDivisions.length > 0 && !selectedDivision) {
      setSelectedDivision(counselorDivisions[0]);
    }
  }, [data, counselorDivisions, selectedDivision]);

  const slots = useMemo(() => {
    const allSlots = data?.entries ?? [];
    if (data?.role === "counselor" && selectedDivision) {
      return allSlots.filter((s) => s.divisionName === selectedDivision);
    }
    return allSlots;
  }, [data, selectedDivision]);

  const showDivision = data?.role === "faculty";
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
            {data?.role === "faculty" ? "My Timetable" : "Timetable"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roleTitle}
          </p>
        </div>

        {data?.role === "counselor" && counselorDivisions.length > 1 && (
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
                {counselorDivisions.map((div) => (
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
                    (s) =>
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
                            {cellSlots.map((slot, idx) => (
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
