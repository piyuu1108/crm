"use client";
// ─────────────────────────────────────────────────────────────────────────────
// ManualTimetableGrid — Drag-and-drop + click-to-assign timetable grid
// Rows = Lectures (1–5), Columns = Days (Mon–Sat)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ManualTimetableCell, TimetableConflict } from "@/lib/types/manual-timetable";
import {
  DAY_KEYS,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  SLOTS_PER_DAY,
  slotKey,
  slotLabel,
} from "@/lib/types/manual-timetable";
import { getConflictsForCell } from "@/lib/manual-timetable-store";

// ─── Pastel Palette ──────────────────────────────────────────────────────────
const PALETTE = [
  { bg: "#e8f0fe", accent: "#4285f4", text: "#1a3b6e" },
  { bg: "#e6f4ea", accent: "#34a853", text: "#1b5e20" },
  { bg: "#fce8e6", accent: "#ea4335", text: "#7f1d1d" },
  { bg: "#fff3e0", accent: "#fb8c00", text: "#6d3a00" },
  { bg: "#f3e8fd", accent: "#a142f4", text: "#4a148c" },
  { bg: "#e0f7fa", accent: "#00acc1", text: "#004d5a" },
  { bg: "#fff8e1", accent: "#f9a825", text: "#5d4004" },
  { bg: "#fce4ec", accent: "#e91e63", text: "#6a0028" },
];

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Composite DnD id for a cell: "day:slot" */
function cellDndId(day: string, slot: string) {
  return `${day}:${slot}`;
}
function parseCellDndId(id: string) {
  const [day, slot] = id.split(":");
  return { day, slot };
}

// ─── Filled Cell (Draggable + Droppable) ─────────────────────────────────────

interface FilledCellProps {
  day: string;
  slot: string;
  cell: ManualTimetableCell;
  colors: (typeof PALETTE)[0];
  hasConflict: boolean;
  cellConflicts: TimetableConflict[];
  onCellClick: (day: string, slot: string) => void;
  onCellClear: (day: string, slot: string) => void;
  isDragging: boolean;
}

function FilledCell({
  day,
  slot,
  cell,
  colors,
  hasConflict,
  cellConflicts,
  onCellClick,
  onCellClear,
  isDragging,
}: FilledCellProps) {
  const id = cellDndId(day, slot);
  const { attributes, listeners, setNodeRef: setDragRef } = useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  // Merge both refs onto the <td>
  const setRefs = useCallback(
    (el: HTMLTableCellElement | null) => {
      setDragRef(el);
      setDropRef(el);
    },
    [setDragRef, setDropRef]
  );

  return (
    <td
      ref={setRefs}
      className={`tt-cell ${cell.isLabSession ? "tt-cell--lab" : "tt-cell--theory"} mtt-cell--clickable ${hasConflict ? "mtt-cell--conflict" : ""} ${isDragging ? "mtt-cell--dragging" : ""} ${isOver && !isDragging ? "mtt-cell--drop-target" : ""}`}
      style={
        {
          "--cell-bg": colors.bg,
          "--cell-accent": colors.accent,
          "--cell-text": colors.text,
        } as React.CSSProperties
      }
      onClick={() => onCellClick(day, slot)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onCellClear(day, slot);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCellClick(day, slot);
        }
      }}
    >
      <div className="tt-card group relative" {...attributes} {...listeners}>
        {/* Lab badge */}
        {cell.isLabSession && cell.labName && (
          <span className="tt-badge">{cell.labName}</span>
        )}
        {/* Subject */}
        <span className="tt-subject">{cell.subjectShortCode}</span>
        {/* Faculty */}
        <span className="tt-faculty">{cell.facultyCode}</span>

        {/* Clear button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCellClear(day, slot);
          }}
          className="absolute top-0 right-0 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-white/80 text-neutral-400 hover:text-red-500 transition-opacity"
          aria-label="Clear cell"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Icon icon="gravity-ui:xmark" width={10} />
        </button>


      </div>
    </td>
  );
}

// ─── Empty Cell (Droppable only) ─────────────────────────────────────────────

interface EmptyCellProps {
  day: string;
  slot: string;
  onCellClick: (day: string, slot: string) => void;
}

function EmptyCell({ day, slot, onCellClick }: EmptyCellProps) {
  const id = cellDndId(day, slot);
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <td
      ref={setNodeRef}
      className={`tt-cell tt-cell--empty mtt-cell--clickable ${isOver ? "mtt-cell--drop-target" : ""}`}
      onClick={() => onCellClick(day, slot)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCellClick(day, slot);
        }
      }}
    >
      <div className="mtt-add-hint">
        <Icon icon={isOver ? "gravity-ui:arrow-down" : "gravity-ui:plus"} width={14} />
      </div>
    </td>
  );
}

// ─── Drag Overlay Card ───────────────────────────────────────────────────────

function DragOverlayCard({ cell, colors }: { cell: ManualTimetableCell; colors: (typeof PALETTE)[0] }) {
  return (
    <div
      className="mtt-drag-overlay"
      style={
        {
          "--cell-bg": colors.bg,
          "--cell-accent": colors.accent,
          "--cell-text": colors.text,
        } as React.CSSProperties
      }
    >
      {cell.isLabSession && cell.labName && (
        <span className="tt-badge">{cell.labName}</span>
      )}
      <span className="tt-subject">{cell.subjectShortCode}</span>
      <span className="tt-faculty">{cell.facultyCode}</span>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ManualTimetableGridProps {
  grid: Record<string, Record<string, ManualTimetableCell | null>>;
  conflicts: TimetableConflict[];
  classId: number;
  title?: string;
  onCellClick: (day: string, slot: string) => void;
  onCellClear: (day: string, slot: string) => void;
  onCellMove: (fromDay: string, fromSlot: string, toDay: string, toSlot: string) => void;
}

export default function ManualTimetableGrid({
  grid,
  conflicts,
  classId,
  title,
  onCellClick,
  onCellClear,
  onCellMove,
}: ManualTimetableGridProps) {
  // ─── DnD state ────────────────────────────────────────────────────
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Require 8px of pointer movement before starting drag (prevents accidental drag on click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Build color map from subject codes in grid
  const colorMap = useMemo(() => {
    const map = new Map<string, (typeof PALETTE)[0]>();
    for (const dayGrid of Object.values(grid)) {
      for (const cell of Object.values(dayGrid)) {
        if (cell) map.set(cell.subjectShortCode, PALETTE[hashStr(cell.subjectShortCode) % PALETTE.length]);
      }
    }
    return map;
  }, [grid]);

  // Active drag cell info (for the floating overlay)
  const activeDragCell = useMemo(() => {
    if (!activeDragId) return null;
    const { day, slot } = parseCellDndId(activeDragId);
    const cell = grid[day]?.[slot] ?? null;
    if (!cell) return null;
    return { cell, colors: colorMap.get(cell.subjectShortCode) || PALETTE[0] };
  }, [activeDragId, grid, colorMap]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const from = parseCellDndId(String(active.id));
      const to = parseCellDndId(String(over.id));
      onCellMove(from.day, from.slot, to.day, to.slot);
    },
    [onCellMove]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="tt-wrapper">
        {title && (
          <div className="tt-header">
            <h3 className="tt-title">{title}</h3>
          </div>
        )}
        <div className="tt-scroll">
          <table className="tt-table">
            <thead>
              <tr>
                <th className="tt-corner" />
                {DAY_KEYS.map((d) => (
                  <th key={d} className="tt-day-col">
                    <span className="tt-day-full">{DAY_LABELS[d]}</span>
                    <span className="tt-day-short">{DAY_SHORT_LABELS[d]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SLOTS_PER_DAY }, (_, i) => i + 1).map((slotNum) => (
                <tr key={slotNum}>
                  <td className="tt-slot-label">
                    <span className="tt-slot-num">{slotLabel(slotNum)}</span>
                  </td>
                  {DAY_KEYS.map((dayKey) => {
                    const slot = slotKey(slotNum);
                    const cell = grid[dayKey]?.[slot] ?? null;
                    const cellConflicts = getConflictsForCell(conflicts, classId, dayKey, slot);
                    const hasConflict = cellConflicts.length > 0;
                    const dndId = cellDndId(dayKey, slot);
                    const isDragging = activeDragId === dndId;

                    if (!cell) {
                      return (
                        <EmptyCell
                          key={dayKey}
                          day={dayKey}
                          slot={slot}
                          onCellClick={onCellClick}
                        />
                      );
                    }

                    return (
                      <FilledCell
                        key={dayKey}
                        day={dayKey}
                        slot={slot}
                        cell={cell}
                        colors={colorMap.get(cell.subjectShortCode) || PALETTE[0]}
                        hasConflict={hasConflict}
                        cellConflicts={cellConflicts}
                        onCellClick={onCellClick}
                        onCellClear={onCellClear}
                        isDragging={isDragging}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragCell && (
          <DragOverlayCard cell={activeDragCell.cell} colors={activeDragCell.colors} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
