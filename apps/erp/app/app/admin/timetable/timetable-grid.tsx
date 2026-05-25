"use client";

import React from "react";
import { Pencil, TrashBin, Flask } from "@gravity-ui/icons";
import type { TimetableSlot } from "@/app/lib/queries/timetable";
import { useDroppable, useDraggable } from "@dnd-kit/core";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const FIXED_TIME_SLOTS = [
  { start: "07:50", end: "08:50" },
  { start: "08:50", end: "09:40" },
  { start: "09:50", end: "10:40" },
  { start: "10:40", end: "11:30" },
  { start: "11:30", end: "12:20" },
];

import { useTimetableColors, type Palette } from "@/app/lib/hooks/use-timetable-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimetableGridProps {
  slots: TimetableSlot[];
  onCellClick: (day: string, startTime: string, endTime: string) => void;
  onEditSlot: (slot: TimetableSlot) => void;
  onDeleteSlot: (slot: TimetableSlot) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTime(t: string) {
  return t ? t.slice(0, 5) : t;
}

function formatTimeRange(start: string, end: string) {
  return `${normalizeTime(start)} - ${normalizeTime(end)}`;
}

// ─── Droppable Cell Wrapper ──────────────────────────────────────────────────

function DroppableCell({
  id,
  day,
  timeStart,
  timeEnd,
  children,
}: {
  id: string;
  day: string;
  timeStart: string;
  timeEnd: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { day, startTime: timeStart, endTime: timeEnd },
  });

  return (
    <td
      ref={setNodeRef}
      className="p-1.5 align-top"
      style={{ minWidth: 140 }}
    >
      <div
        className={`h-full min-h-[88px] rounded-lg transition-colors duration-150 overflow-hidden ${
          isOver ? "ring-2 ring-blue-300/60 bg-blue-50/40" : ""
        }`}
      >
        {children}
      </div>
    </td>
  );
}

// ─── Draggable Filled Slot ──────────────────────────────────────────────────

function DraggableSlot({
  slot,
  palette,
  onEditSlot,
  onDeleteSlot,
}: {
  slot: TimetableSlot;
  palette: Palette;
  onEditSlot: (slot: TimetableSlot) => void;
  onDeleteSlot: (slot: TimetableSlot) => void;
}) {
  const uniqueId = `slot-${slot.id || `${slot.assignmentId}-${slot.dayOfWeek}-${slot.startTime}`}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: uniqueId,
    data: { slot },
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group/slot relative flex flex-col gap-1 rounded-lg p-3 min-h-[80px] transition-all duration-200 select-none ${
        isDragging
          ? "opacity-60 shadow-lg cursor-grabbing scale-[1.03]"
          : "cursor-grab hover:shadow-md"
      }`}
      style={{
        ...style,
        backgroundColor: palette.bg,
        border: `1.5px solid ${palette.border}`,
      }}
    >
      {/* Subject name — fixed width, ellipsis overflow, full name on hover */}
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

      {/* Faculty name — always truncated, full on hover via title */}
      <span
        className="text-[11px] leading-tight mt-auto pointer-events-none truncate block"
        style={{ color: `${palette.text}99` }}
        title={slot.facultyName}
      >
        {slot.facultyName}
      </span>

      {/* Action buttons — bottom-left, visible on hover */}
      <div
        className="flex items-center gap-1 mt-1 opacity-0 group-hover/slot:opacity-100 transition-opacity duration-150"
      >
        <button
          type="button"
          className="p-1 rounded-md transition-colors"
          style={{
            backgroundColor: `${palette.border}30`,
            color: palette.text,
          }}
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEditSlot(slot);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          className="p-1 rounded-md transition-colors hover:bg-red-100"
          style={{
            backgroundColor: `${palette.border}30`,
            color: "#b91c1c",
          }}
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSlot(slot);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <TrashBin className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Empty Cell ──────────────────────────────────────────────────────────────

function EmptyCell({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center w-full h-full min-h-[80px] rounded-lg border-2 border-dashed border-gray-200 text-[12px] text-gray-400 cursor-pointer transition-all duration-150 hover:border-blue-300/60 hover:bg-blue-50/30 hover:text-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/40"
      onClick={onClick}
    >
      Click to add
    </button>
  );
}

// ─── TimetableGrid ──────────────────────────────────────────────────────────

export function TimetableGrid({
  slots,
  onCellClick,
  onEditSlot,
  onDeleteSlot,
}: TimetableGridProps) {
  const timeSlots = FIXED_TIME_SLOTS;
  const { getColorForSlot } = useTimetableColors(slots, "subject");

  return (
    <div className="overflow-auto rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <table
        className="w-full border-collapse"
        style={{ minWidth: 960, tableLayout: "fixed" }}
      >
        {/* Column widths */}
        <colgroup>
          <col style={{ width: 110 }} />
          {DAYS.map((day) => (
            <col key={day} />
          ))}
        </colgroup>
        {/* ── Header Row ─── */}
        <thead>
          <tr>
            {/* Time header */}
            <th
              className="sticky left-0 z-10 w-[110px] bg-gray-50/80 backdrop-blur-sm px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 border-b border-r border-gray-200/60"
            >
              Time
            </th>
            {DAYS.map((day, i) => (
              <th
                key={day}
                className="bg-gray-50/80 backdrop-blur-sm px-2 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200/60"
                style={{ minWidth: 140 }}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAY_SHORT[i]}</span>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body Rows ─── */}
        <tbody>
          {timeSlots.map((time, rowIdx) => (
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
                  <DroppableCell
                    key={`${day}-${time.start}`}
                    id={`cell-${day}-${time.start}-${time.end}`}
                    day={day}
                    timeStart={time.start}
                    timeEnd={time.end}
                  >
                    {cellSlots.length > 0 ? (
                      <div className="flex flex-col gap-1.5 h-full">
                        {cellSlots.map((slot, idx) => (
                          <DraggableSlot
                            key={slot.id || idx}
                            slot={slot}
                            palette={getColorForSlot(slot)}
                            onEditSlot={onEditSlot}
                            onDeleteSlot={onDeleteSlot}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyCell
                        onClick={() => onCellClick(day, time.start, time.end)}
                      />
                    )}
                  </DroppableCell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
